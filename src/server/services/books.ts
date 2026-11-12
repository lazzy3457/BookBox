import { publicUserSelect } from "@/server/db/selects";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { GoogleBookCandidate } from "@/server/services/googleBooks";
import { MAX_EDITION_ISBNS, normalizeLanguageCode } from "@/server/services/externalBooks";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { fetchGoogleBookDetails } from "@/server/services/googleBooks";
import { normalizeGenres } from "@/lib/genres";
import { slugifyAuthor } from "@/lib/authors";
import { bookMatchKey, candidateIsbns, openLibraryKeys } from "@/lib/catalog";
import { conflict, notFound } from "@/server/http/errors";

type Candidate = ExternalBookCandidate | GoogleBookCandidate;
type Db = Prisma.TransactionClient;

function bookData(candidate: Candidate) {
  return {
    title: candidate.title,
    authors: candidate.authors,
    description: candidate.description,
    thumbnailUrl: candidate.thumbnailUrl,
    publishedDate: candidate.publishedDate,
    publisher: candidate.publisher,
    pageCount: candidate.pageCount,
    language: normalizeLanguageCode(candidate.language),
    genres: normalizeGenres(candidate.genres),
    source: candidate.source ?? (candidate.googleBooksVolumeId ? "google_books" : "open_library")
  };
}

// Identifiants qui désignent UNE édition. Un ISBN n'en fait partie que si la
// liste du candidat n'en mélange pas plusieurs (au plus MAX_EDITION_ISBNS).
function editionIdentifiers(candidate: Candidate) {
  const { editionKey, workKey } = openLibraryKeys(candidate.openLibraryKey, candidate.openLibraryWorkKey);
  const isbns = candidateIsbns(candidate.isbn13, candidate.isbn10);

  return {
    workKey,
    identifiers: {
      googleBooksVolumeId: candidate.googleBooksVolumeId,
      openLibraryKey: editionKey,
      isbn13: isbns.length <= MAX_EDITION_ISBNS ? isbns[0] : undefined
    }
  };
}

type EditionIdentifiers = ReturnType<typeof editionIdentifiers>["identifiers"];
const IDENTIFIER_FIELDS = ["googleBooksVolumeId", "openLibraryKey", "isbn13"] as const;

// Rapprochement d'une édition : uniquement par identifiant, du plus sûr
// (celui de la source) à l'ISBN.
async function findExistingEdition(identifiers: EditionIdentifiers) {
  for (const field of IDENTIFIER_FIELDS) {
    const value = identifiers[field];
    if (!value) continue;
    const edition = await prisma.edition.findFirst({ where: { [field]: value }, include: { book: true } });
    if (edition) return edition;
  }

  return null;
}

// Rapprochement du livre quand l'édition est nouvelle : la clé d'œuvre Open
// Library, sinon le titre et le premier auteur normalisés.
async function findExistingBook(workKey: string | undefined, matchKey: string | null) {
  if (workKey) {
    const book = await prisma.book.findUnique({ where: { openLibraryWorkKey: workKey } });
    if (book) return book;
  }

  return matchKey ? prisma.book.findFirst({ where: { matchKey }, orderBy: { createdAt: "asc" } }) : null;
}

// Identifiants du candidat que l'édition n'a pas encore, sauf ceux qu'une
// autre édition porte déjà (doublon hérité : la fusion s'en charge).
async function missingIdentifiers(edition: { id: string } & Record<(typeof IDENTIFIER_FIELDS)[number], string | null>, identifiers: EditionIdentifiers) {
  const wanted = IDENTIFIER_FIELDS.filter((field) => identifiers[field] && !edition[field]);
  if (!wanted.length) return {};

  const taken = await prisma.edition.findMany({
    where: { id: { not: edition.id }, OR: wanted.map((field) => ({ [field]: identifiers[field] })) },
    select: { googleBooksVolumeId: true, openLibraryKey: true, isbn13: true }
  });

  return Object.fromEntries(
    wanted
      .filter((field) => !taken.some((other) => other[field] === identifiers[field]))
      .map((field) => [field, identifiers[field]])
  );
}

// Crée les fiches auteur manquantes et les relie au livre. Sans identifiant
// externe, un auteur est reconnu par son slug ; une graphie nouvelle du même
// nom est gardée en alias.
export async function syncBookAuthors(db: Db, bookId: string, names: readonly string[]) {
  for (const [position, name] of names.entries()) {
    const slug = slugifyAuthor(name);
    if (!slug) continue;

    const existing = await db.author.findUnique({ where: { slug } });
    const author = existing ?? await db.author.create({ data: { slug, name } });
    if (existing && existing.name !== name && !existing.aliases.includes(name)) {
      await db.author.update({ where: { id: existing.id }, data: { aliases: { push: name } } });
    }
    await db.bookAuthor.createMany({ data: [{ bookId, authorId: author.id, position }], skipDuplicates: true });
  }
}

// Enregistre l'édition choisie dans une recherche externe et renvoie son
// livre. Deux éditions d'une même œuvre arrivent sur le même livre.
export async function upsertExternalBook(candidate: Candidate) {
  const { workKey, identifiers } = editionIdentifiers(candidate);
  const data = bookData(candidate);
  const matchKey = bookMatchKey(data.title, data.authors);
  const existingEdition = await findExistingEdition(identifiers);
  const existingBook = existingEdition?.book ?? await findExistingBook(workKey, matchKey);

  // La fiche Google du volume complète ce que la liste de résultats ne donne
  // pas : genres précis, nombre de pages (sans lui, pas de pourcentage de
  // lecture), éditeur. Appelée seulement s'il manque quelque chose.
  const pageCountKnown = existingEdition?.pageCount ?? data.pageCount;
  const publisherKnown = existingEdition?.publisher ?? data.publisher;
  if (identifiers.googleBooksVolumeId && (!existingBook?.genres.length || !pageCountKnown || !publisherKnown)) {
    const details = await fetchGoogleBookDetails(identifiers.googleBooksVolumeId);
    if (details.genres.length && !existingBook?.genres.length) data.genres = details.genres;
    data.pageCount ??= details.pageCount;
    data.publisher ??= details.publisher;
  }

  const editionFields = {
    title: data.title,
    publisher: data.publisher,
    publishedDate: data.publishedDate,
    pageCount: data.pageCount,
    language: data.language,
    thumbnailUrl: data.thumbnailUrl
  };
  const freeIdentifiers = existingEdition ? await missingIdentifiers(existingEdition, identifiers) : identifiers;
  const workKeyIsFree = Boolean(workKey && existingBook && !existingBook.openLibraryWorkKey
    && !(await prisma.book.findUnique({ where: { openLibraryWorkKey: workKey }, select: { id: true } })));

  return prisma.$transaction(async (tx) => {
    // La fiche en base fait foi : on complète ses champs vides, sans jamais
    // remplacer un titre, une couverture ou un éditeur déjà renseignés.
    const book = existingBook
      ? await tx.book.update({
          where: { id: existingBook.id },
          data: {
            authors: existingBook.authors.length ? existingBook.authors : data.authors,
            description: existingBook.description ?? data.description,
            thumbnailUrl: existingBook.thumbnailUrl ?? data.thumbnailUrl,
            publishedDate: existingBook.publishedDate ?? data.publishedDate,
            publisher: existingBook.publisher ?? data.publisher,
            pageCount: existingBook.pageCount ?? data.pageCount,
            language: existingBook.language ?? data.language,
            genres: existingBook.genres.length ? existingBook.genres : data.genres,
            matchKey: existingBook.matchKey ?? matchKey,
            ...(workKeyIsFree ? { openLibraryWorkKey: workKey } : {})
          }
        })
      : await tx.book.create({ data: { ...data, matchKey, openLibraryWorkKey: workKey } });

    if (!existingBook?.authors.length) await syncBookAuthors(tx, book.id, book.authors);

    const edition = existingEdition
      ? await tx.edition.update({
          where: { id: existingEdition.id },
          data: {
            ...freeIdentifiers,
            publisher: existingEdition.publisher ?? editionFields.publisher,
            publishedDate: existingEdition.publishedDate ?? editionFields.publishedDate,
            pageCount: existingEdition.pageCount ?? editionFields.pageCount,
            language: existingEdition.language ?? editionFields.language,
            thumbnailUrl: existingEdition.thumbnailUrl ?? editionFields.thumbnailUrl
          }
        })
      : await tx.edition.create({ data: { bookId: book.id, ...freeIdentifiers, ...editionFields, source: data.source } });

    return { ...book, editionId: edition.id };
  });
}

export async function upsertGoogleBook(candidate: GoogleBookCandidate) {
  return upsertExternalBook({
    ...candidate,
    source: "google_books"
  });
}

export async function upsertOpenLibraryBook(candidate: ExternalBookCandidate) {
  return upsertExternalBook({
    ...candidate,
    source: "open_library"
  });
}

export async function createManualBook(input: {
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
  genres?: string[];
}) {
  const editionFields = {
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    publishedDate: input.publishedDate,
    publisher: input.publisher,
    pageCount: input.pageCount,
    language: input.language
  };

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        ...editionFields,
        authors: input.authors,
        description: input.description,
        genres: normalizeGenres(input.genres),
        matchKey: bookMatchKey(input.title, input.authors),
        source: "manual"
      }
    });
    await syncBookAuthors(tx, book.id, book.authors);
    const edition = await tx.edition.create({ data: { bookId: book.id, ...editionFields, source: "manual" } });

    return { ...book, editionId: edition.id };
  });
}

// La fiche d'un livre est partagée par tous ses lecteurs. Un lecteur ne peut
// que renseigner un nombre de pages manquant, pour un livre de sa
// bibliothèque ; seul un admin peut corriger un nombre déjà renseigné.
export async function setBookPageCount(input: { userId: string; bookId: string; pageCount: number; isAdmin: boolean }) {
  const { userId, bookId, pageCount, isAdmin } = input;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { pageCount: true, libraries: { where: { userId }, select: { id: true } } }
  });

  if (!book) {
    throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
  }

  if (isAdmin) {
    await prisma.book.update({ where: { id: bookId }, data: { pageCount } });
    if (book.pageCount && book.pageCount !== pageCount) await recomputeReadingPercentages(bookId, pageCount);
    return { id: bookId, pageCount };
  }

  if (!book.libraries.length) {
    throw notFound("Ce livre n'est pas dans ta bibliothèque.", "BOOK_NOT_IN_LIBRARY");
  }

  // La condition sur pageCount évite qu'un second envoi simultané écrase le premier.
  const { count } = book.pageCount
    ? { count: 0 }
    : await prisma.book.updateMany({ where: { id: bookId, pageCount: null }, data: { pageCount } });

  if (!count) {
    throw conflict("Le nombre de pages de ce livre est déjà renseigné.", "PAGE_COUNT_ALREADY_SET");
  }

  return { id: bookId, pageCount };
}

// Le pourcentage d'une page notée est figé à l'enregistrement, d'après le
// nombre de pages de l'époque : après une correction, on le recalcule pour
// toutes les pages notées de ce livre (les citations n'en ont pas).
async function recomputeReadingPercentages(bookId: string, pageCount: number) {
  const entries = await prisma.readingEntry.findMany({
    where: { kind: "NOTE", page: { not: null }, period: { userBook: { bookId } } },
    select: { id: true, page: true }
  });
  const idsByPercentage = new Map<number, string[]>();

  entries.forEach((entry) => {
    const percentage = Math.min(100, Math.round(((entry.page ?? 0) / pageCount) * 100));
    idsByPercentage.set(percentage, [...(idsByPercentage.get(percentage) ?? []), entry.id]);
  });

  for (const [percentage, ids] of idsByPercentage) {
    await prisma.readingEntry.updateMany({ where: { id: { in: ids } }, data: { percentage } });
  }
}

export async function getBookDetails(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      reviews: {
        where: { chapter: 0, hiddenAt: null, user: { suspendedAt: null } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: publicUserSelect },
          reactions: true,
          comments: {
            where: { hiddenAt: null, user: { suspendedAt: null } },
            include: { user: { select: publicUserSelect }, likes: true },
            orderBy: { createdAt: "asc" }
          }
        }
      },
      libraries: { where: { user: { suspendedAt: null } } }
    }
  });
}
