// Renseigne les genres des livres existants à partir de Google Books ou Open Library.
// Usage : npm run genres:backfill [-- --dry-run]
// Nécessite Node.js 22.18+ ou 24+ (chargement direct de src/lib/genres.ts).
import { PrismaClient } from "@prisma/client";
import { genresFromCategories } from "../src/lib/genres.ts";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  return response.json();
}

async function googleCategories(volumeId) {
  const url = new URL(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}`);
  url.searchParams.set("fields", "volumeInfo/categories");
  if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const payload = await fetchJson(url);
  return payload?.volumeInfo?.categories ?? [];
}

async function openLibrarySubjects(key) {
  const workKey = key.startsWith("/works/")
    ? key
    : (await fetchJson(`https://openlibrary.org/books/${encodeURIComponent(key.replace(/^\/books\//, ""))}.json`))?.works?.[0]?.key;
  if (!workKey) return [];
  const work = await fetchJson(`https://openlibrary.org${workKey}.json`);
  return work?.subjects ?? [];
}

try {
  const books = await prisma.book.findMany({
    where: { genres: { isEmpty: true }, OR: [{ googleBooksVolumeId: { not: null } }, { openLibraryKey: { not: null } }] },
    select: { id: true, title: true, googleBooksVolumeId: true, openLibraryKey: true }
  });
  console.log(`${books.length} livre(s) sans genre à examiner${dryRun ? " (simulation)" : ""}.`);

  let updated = 0;
  for (const book of books) {
    try {
      let genres = book.googleBooksVolumeId ? genresFromCategories(await googleCategories(book.googleBooksVolumeId)) : [];
      if (!genres.length && book.openLibraryKey) genres = genresFromCategories(await openLibrarySubjects(book.openLibraryKey));

      if (genres.length) {
        updated += 1;
        console.log(`✓ ${book.title} → ${genres.join(", ")}`);
        if (!dryRun) await prisma.book.update({ where: { id: book.id }, data: { genres } });
      } else {
        console.log(`· ${book.title} : aucun genre reconnu`);
      }
    } catch (error) {
      console.warn(`! ${book.title} : ${error instanceof Error ? error.message : error}`);
    }
    await wait(250);
  }

  console.log(`${updated} livre(s) ${dryRun ? "à mettre à jour" : "mis à jour"}.`);
} finally {
  await prisma.$disconnect();
}
