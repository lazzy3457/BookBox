// Complète le catalogue après la migration « livres et éditions » :
//   1. clé de rapprochement (titre + premier auteur) des livres qui n'en ont pas ;
//   2. fiches auteur des livres qui n'y sont pas encore reliés ;
//   3. fusion des livres en double (même clé de rapprochement) : le livre le plus
//      présent dans les bibliothèques est conservé, l'autre y est redirigé.
// Peut être relancé sans risque. Usage : npm run catalog:backfill [-- --dry-run]
// Nécessite Node.js 22.18+ ou 24+ (chargement direct des fichiers TypeScript de src/lib).
import { PrismaClient } from "@prisma/client";
import { bookMatchKey } from "../src/lib/catalog.ts";
import { slugifyAuthor } from "../src/lib/authors.ts";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function fillMatchKeys() {
  const books = await prisma.book.findMany({ where: { matchKey: null }, select: { id: true, title: true, authors: true } });
  const keyed = books.map((book) => ({ id: book.id, matchKey: bookMatchKey(book.title, book.authors) })).filter((book) => book.matchKey);
  if (!dryRun) {
    for (const book of keyed) await prisma.book.update({ where: { id: book.id }, data: { matchKey: book.matchKey } });
  }
  console.log(`Clés de rapprochement : ${keyed.length} livre(s) ${dryRun ? "à compléter" : "complété(s)"}, ${books.length - keyed.length} sans auteur laissé(s) sans clé.`);
  return new Map(keyed.map((book) => [book.id, book.matchKey]));
}

// Même règle que syncBookAuthors (src/server/services/books.ts).
async function linkAuthors() {
  const books = await prisma.book.findMany({ where: { bookAuthors: { none: {} }, NOT: { authors: { isEmpty: true } } }, select: { id: true, authors: true } });
  if (!dryRun) {
    for (const book of books) {
      for (const [position, name] of book.authors.entries()) {
        const slug = slugifyAuthor(name);
        if (!slug) continue;
        const existing = await prisma.author.findUnique({ where: { slug } });
        const author = existing ?? await prisma.author.create({ data: { slug, name } });
        if (existing && existing.name !== name && !existing.aliases.includes(name)) {
          await prisma.author.update({ where: { id: existing.id }, data: { aliases: { push: name } } });
        }
        await prisma.bookAuthor.createMany({ data: [{ bookId: book.id, authorId: author.id, position }], skipDuplicates: true });
      }
    }
  }
  console.log(`Fiches auteur : ${books.length} livre(s) ${dryRun ? "à relier" : "relié(s)"}.`);
}

// Tout ce qui pointait sur `source` pointe sur `target`. Quand un lecteur a les
// deux livres, une seule ligne survit par contrainte d'unicité : le statut le plus
// avancé, l'avis le plus récent, le chapitre le plus loin.
async function mergeBook(tx, source, target) {
  const ids = [source, target];

  await tx.$executeRaw`
    UPDATE "ReadingPeriod" AS rp SET "userBookId" = t."id"
    FROM "UserBook" AS s JOIN "UserBook" AS t ON t."userId" = s."userId" AND t."bookId" = ${target}
    WHERE s."bookId" = ${source} AND rp."userBookId" = s."id"`;
  await tx.$executeRaw`
    UPDATE "UserBook" AS t SET
      "status" = CASE
        WHEN array_position(ARRAY['TO_READ', 'ABANDONED', 'READING', 'READ'], s."status"::text) > array_position(ARRAY['TO_READ', 'ABANDONED', 'READING', 'READ'], t."status"::text)
        THEN s."status" ELSE t."status" END,
      "isFavorite" = t."isFavorite" OR s."isFavorite",
      "createdAt" = LEAST(t."createdAt", s."createdAt"),
      "editionId" = COALESCE(t."editionId", s."editionId")
    FROM "UserBook" AS s
    WHERE s."userId" = t."userId" AND s."bookId" = ${source} AND t."bookId" = ${target}`;
  await tx.$executeRaw`
    DELETE FROM "UserBook" AS s USING "UserBook" AS t
    WHERE s."bookId" = ${source} AND t."bookId" = ${target} AND s."userId" = t."userId"`;
  await tx.$executeRaw`UPDATE "UserBook" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  await tx.$executeRaw`
    DELETE FROM "Review" AS older USING "Review" AS newer
    WHERE older."bookId" = ANY(${ids}) AND newer."bookId" = ANY(${ids}) AND older."bookId" <> newer."bookId"
      AND older."userId" = newer."userId" AND older."chapter" = newer."chapter"
      AND (older."updatedAt", older."id") < (newer."updatedAt", newer."id")`;
  await tx.$executeRaw`UPDATE "Review" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  await tx.$executeRaw`
    DELETE FROM "BookListEntry" AS s USING "BookListEntry" AS t
    WHERE s."bookId" = ${source} AND t."bookId" = ${target} AND s."listId" = t."listId"`;
  await tx.$executeRaw`UPDATE "BookListEntry" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  await tx.$executeRaw`
    DELETE FROM "RecommendationDismissal" AS s USING "RecommendationDismissal" AS t
    WHERE s."bookId" = ${source} AND t."bookId" = ${target} AND s."userId" = t."userId"`;
  await tx.$executeRaw`UPDATE "RecommendationDismissal" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  await tx.$executeRaw`
    UPDATE "ChapterProgress" AS t SET "chapter" = GREATEST(t."chapter", s."chapter")
    FROM "ChapterProgress" AS s
    WHERE s."bookId" = ${source} AND t."bookId" = ${target} AND s."userId" = t."userId"`;
  await tx.$executeRaw`
    DELETE FROM "ChapterProgress" AS s USING "ChapterProgress" AS t
    WHERE s."bookId" = ${source} AND t."bookId" = ${target} AND s."userId" = t."userId"`;
  await tx.$executeRaw`UPDATE "ChapterProgress" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  await tx.$executeRaw`UPDATE "Group" SET "bookId" = ${target} WHERE "bookId" = ${source}`;
  await tx.$executeRaw`UPDATE "Group" SET "readalongBookId" = ${target} WHERE "readalongBookId" = ${source}`;
  await tx.$executeRaw`UPDATE "GroupThread" SET "bookId" = ${target} WHERE "bookId" = ${source}`;

  // L'XP d'un livre (ajout, lecture, avis) n'est gagné qu'une fois : sa source est l'identifiant du livre.
  await tx.$executeRaw`
    DELETE FROM "XpEvent" AS s USING "XpEvent" AS t
    WHERE s."sourceId" = ${source} AND t."sourceId" = ${target} AND s."userId" = t."userId" AND s."reason" = t."reason"`;
  await tx.$executeRaw`UPDATE "XpEvent" SET "sourceId" = ${target} WHERE "sourceId" = ${source}`;

  await tx.$executeRaw`UPDATE "Edition" SET "bookId" = ${target} WHERE "bookId" = ${source}`;
  await tx.$executeRaw`
    INSERT INTO "BookAuthor" ("bookId", "authorId", "role", "position")
    SELECT ${target}, "authorId", "role", "position" FROM "BookAuthor" WHERE "bookId" = ${source}
    ON CONFLICT DO NOTHING`;

  // Le livre conservé récupère ce qui lui manquait.
  const removed = await tx.book.delete({ where: { id: source } });
  const kept = await tx.book.findUniqueOrThrow({ where: { id: target } });
  await tx.book.update({
    where: { id: target },
    data: {
      openLibraryWorkKey: kept.openLibraryWorkKey ?? removed.openLibraryWorkKey,
      description: kept.description ?? removed.description,
      thumbnailUrl: kept.thumbnailUrl ?? removed.thumbnailUrl,
      publishedDate: kept.publishedDate ?? removed.publishedDate,
      publisher: kept.publisher ?? removed.publisher,
      pageCount: kept.pageCount ?? removed.pageCount,
      language: kept.language ?? removed.language,
      genres: kept.genres.length ? kept.genres : removed.genres
    }
  });

  // Les redirections qui menaient au livre retiré ont disparu avec lui : on les recrée vers le livre conservé.
  const formerIds = await tx.bookRedirect.findMany({ where: { bookId: source }, select: { fromId: true } });
  await tx.bookRedirect.createMany({ data: [source, ...formerIds.map((redirect) => redirect.fromId)].map((fromId) => ({ fromId, bookId: target })), skipDuplicates: true });
}

async function mergeDuplicates(pendingKeys) {
  const books = await prisma.book.findMany({
    select: { id: true, title: true, authors: true, matchKey: true, createdAt: true, _count: { select: { libraries: true, reviews: true } } },
    orderBy: { createdAt: "asc" }
  });
  const groups = new Map();
  for (const book of books) {
    const key = book.matchKey ?? pendingKeys.get(book.id);
    if (key) groups.set(key, [...(groups.get(key) ?? []), book]);
  }

  let merged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Conservé : le plus présent dans les bibliothèques, puis le plus ancien.
    const [target, ...sources] = [...group].sort((a, b) => b._count.libraries - a._count.libraries || a.createdAt - b.createdAt);
    for (const source of sources) {
      merged += 1;
      console.log(`${dryRun ? "À fusionner" : "Fusion"} : « ${source.title} » (${source.id}, ${source._count.libraries} lecteur(s), ${source._count.reviews} avis) → « ${target.title} » (${target.id})`);
      if (!dryRun) await prisma.$transaction((tx) => mergeBook(tx, source.id, target.id));
    }
  }
  console.log(`Doublons : ${merged} livre(s) ${dryRun ? "à fusionner" : "fusionné(s)"}.`);
}

try {
  const pendingKeys = await fillMatchKeys();
  await linkAuthors();
  await mergeDuplicates(dryRun ? pendingKeys : new Map());
} finally {
  await prisma.$disconnect();
}
