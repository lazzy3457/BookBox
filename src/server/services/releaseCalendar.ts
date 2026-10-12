import { prisma } from "@/server/db/prisma";
import { searchGoogleBooks } from "@/server/services/googleBooks";
import { searchOpenLibrary } from "@/server/services/openLibrary";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { slugifyAuthor } from "@/lib/authors";
import { parseReleaseDate, releaseDateValue, toIsoDay } from "@/lib/releaseDates";

// Fenêtre affichée : les sorties récentes et l'année à venir.
const PAST_DAYS = 120;
const FUTURE_DAYS = 365;
const MAX_FOLLOWED_AUTHORS = 8;
const POPULAR_LIBRARY_COUNT = 2;

export type ReleaseCalendarItem = {
  key: string;
  bookId: string | null;
  external: ExternalBookCandidate | null;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  publisher: string | null;
  genres: string[];
  releaseDate: string;
  isPopular: boolean;
  followedAuthors: string[];
};

export type ReleaseCalendar = {
  today: string;
  items: ReleaseCalendarItem[];
  followedAuthors: string[];
};

function signature(title: string, authors: string[]) {
  return `${slugifyAuthor(title)}|${slugifyAuthor(authors[0] ?? "")}`;
}

// Les auteurs « suivis » sont ceux présents dans la bibliothèque de l'utilisateur,
// classés par nombre de livres.
async function getLibraryAuthors(userId: string) {
  const entries = await prisma.userBook.findMany({
    where: { userId },
    select: { book: { select: { authors: true } } }
  });
  const counts = new Map<string, { name: string; count: number }>();

  for (const entry of entries) {
    for (const name of entry.book.authors) {
      const slug = slugifyAuthor(name);
      if (!slug) continue;
      const current = counts.get(slug);
      if (current) current.count += 1;
      else counts.set(slug, { name, count: 1 });
    }
  }

  return [...counts.entries()].sort(([, a], [, b]) => b.count - a.count);
}

// Une source externe indisponible ne doit pas vider le calendrier.
async function newestExternalBooks(search: Promise<{ items: ExternalBookCandidate[] }>) {
  try {
    return (await search).items;
  } catch {
    return [];
  }
}

export async function getReleaseCalendar(userId?: string | null): Promise<ReleaseCalendar> {
  const now = new Date();
  const today = toIsoDay(now);
  const from = new Date(now.getTime() - PAST_DAYS * 86_400_000);
  const to = new Date(now.getTime() + FUTURE_DAYS * 86_400_000);
  const fromValue = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1);
  const toValue = to.getTime();

  const libraryAuthors = userId ? await getLibraryAuthors(userId) : [];
  const followedSlugs = new Map(libraryAuthors.map(([slug, { name }]) => [slug, name]));
  const queriedAuthors = libraryAuthors.slice(0, MAX_FOLLOWED_AUTHORS).map(([, { name }]) => name);

  const [localBooks, ...externalResults] = await Promise.all([
    prisma.book.findMany({
      where: { publishedDate: { gte: toIsoDay(from).slice(0, 7), lte: `${toIsoDay(to)}~` } },
      select: {
        id: true,
        title: true,
        authors: true,
        thumbnailUrl: true,
        publisher: true,
        genres: true,
        publishedDate: true,
        _count: { select: { libraries: true } }
      },
      take: 300
    }),
    // Auteurs de la bibliothèque d'abord, pour que leurs livres gagnent la déduplication.
    ...queriedAuthors.flatMap((name) => [
      newestExternalBooks(searchGoogleBooks(name, 0, { mode: "author", orderBy: "newest", pageSize: 20 })),
      newestExternalBooks(searchOpenLibrary(name, 0, { mode: "author", orderBy: "newest", pageSize: 20 }))
    ]),
    newestExternalBooks(
      searchOpenLibrary(`first_publish_year:[${from.getUTCFullYear()} TO ${to.getUTCFullYear()}]`, 0, {
        orderBy: "newest",
        language: "fr",
        pageSize: 60
      })
    ),
    newestExternalBooks(searchGoogleBooks("subject:fiction", 0, { orderBy: "newest", language: "fr", pageSize: 40 }))
  ]);

  const items = new Map<string, ReleaseCalendarItem>();

  function followedAuthorsOf(authors: string[]) {
    return authors.filter((name) => followedSlugs.has(slugifyAuthor(name)));
  }

  function inWindow(value: string | null | undefined) {
    const date = parseReleaseDate(value);
    if (!date) return null;
    const time = releaseDateValue(date);
    return time >= fromValue && time <= toValue ? date : null;
  }

  // Les livres déjà en base passent en premier : ils ont une fiche et une popularité.
  for (const book of localBooks) {
    const date = inWindow(book.publishedDate);
    if (!date) continue;
    const key = signature(book.title, book.authors);
    if (items.has(key)) continue;

    items.set(key, {
      key: `book:${book.id}`,
      bookId: book.id,
      external: null,
      title: book.title,
      authors: book.authors,
      thumbnailUrl: book.thumbnailUrl,
      publisher: book.publisher,
      genres: book.genres,
      releaseDate: date.iso,
      isPopular: book._count.libraries >= POPULAR_LIBRARY_COUNT,
      followedAuthors: followedAuthorsOf(book.authors)
    });
  }

  for (const book of externalResults.flat()) {
    const date = inWindow(book.publishedDate);
    if (!date) continue;
    const key = signature(book.title, book.authors);
    if (items.has(key)) continue;

    items.set(key, {
      key: book.externalId ?? key,
      bookId: null,
      external: book,
      title: book.title,
      authors: book.authors,
      thumbnailUrl: book.thumbnailUrl ?? null,
      publisher: book.publisher ?? null,
      genres: book.genres ?? [],
      releaseDate: date.iso,
      isPopular: false,
      followedAuthors: followedAuthorsOf(book.authors)
    });
  }

  return {
    today,
    items: [...items.values()].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)),
    followedAuthors: [...followedSlugs.values()]
  };
}
