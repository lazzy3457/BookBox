import { googleBookUpsertSchema } from "@/server/validation/books";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";
import { genresFromCategories } from "@/lib/genres";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export type GoogleBookCandidate = {
  externalId?: string;
  source?: "google_books";
  googleBooksVolumeId: string;
  openLibraryKey?: string;
  isbn10?: string[];
  isbn13?: string[];
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
  genres?: string[];
};

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    language?: string;
    categories?: string[];
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
};

type GoogleBooksResponse = {
  totalItems?: number;
  items?: GoogleVolume[];
};

export const GOOGLE_BOOKS_PAGE_SIZE = 24;
export const GOOGLE_BOOKS_AUTHOR_PAGE_SIZE = 40;

type SearchGoogleBooksOptions = {
  mode?: "all" | "title" | "author" | "isbn";
  language?: string;
  pageSize?: number;
  orderBy?: "relevance" | "newest";
};

function buildGoogleBooksQuery(query: string, mode: SearchGoogleBooksOptions["mode"]) {
  const normalizedQuery = query.replace(/"/g, "").trim();

  if (mode === "author") {
    return `inauthor:"${normalizedQuery}"`;
  }

  if (mode === "title") {
    return `intitle:"${normalizedQuery}"`;
  }

  if (mode === "isbn") {
    return `isbn:${normalizeIsbn(normalizedQuery)}`;
  }

  return query;
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}

function isbnByType(
  identifiers: Array<{ type?: string; identifier?: string }> | undefined,
  type: "ISBN_10" | "ISBN_13"
) {
  return (identifiers ?? [])
    .filter((identifier) => identifier.type === type && identifier.identifier)
    .map((identifier) => normalizeIsbn(identifier.identifier ?? ""))
    .filter(Boolean);
}

export function normalizeGoogleBook(item: GoogleVolume) {
  const volume = item.volumeInfo ?? {};
  const parsedBook = googleBookUpsertSchema.parse({
    googleBooksVolumeId: item.id,
    title: volume.title ?? "Titre inconnu",
    authors: volume.authors ?? [],
    description: volume.description,
    thumbnailUrl: volume.imageLinks?.thumbnail?.replace("http://", "https://") ?? volume.imageLinks?.smallThumbnail,
    publishedDate: volume.publishedDate,
    publisher: volume.publisher,
    pageCount: volume.pageCount,
    language: volume.language,
    genres: genresFromCategories(volume.categories),
    isbn10: isbnByType(volume.industryIdentifiers, "ISBN_10"),
    isbn13: isbnByType(volume.industryIdentifiers, "ISBN_13")
  });

  return {
    ...parsedBook,
    externalId: `google-books:${item.id}`,
    source: "google_books" as const
  } satisfies ExternalBookCandidate;
}

export async function searchGoogleBooks(query: string, startIndex = 0, options: SearchGoogleBooksOptions = {}) {
  const pageSize = Math.min(Math.max(options.pageSize ?? GOOGLE_BOOKS_PAGE_SIZE, 1), 40);
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", buildGoogleBooksQuery(query, options.mode ?? "all"));
  url.searchParams.set("maxResults", String(pageSize));
  url.searchParams.set("startIndex", String(startIndex));
  url.searchParams.set("printType", "books");

  if (options.orderBy === "newest") {
    url.searchParams.set("orderBy", "newest");
  }

  if (options.language && options.language !== "all") {
    url.searchParams.set("langRestrict", options.language.slice(0, 2).toLowerCase());
  }

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const response = await fetchWithTimeout(url, {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw Object.assign(new Error("La recherche Google Books est momentanément indisponible."), {
      status: 502,
      code: "GOOGLE_BOOKS_UNAVAILABLE"
    });
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  const items = (payload.items ?? []).map(normalizeGoogleBook);

  return {
    items,
    totalItems: payload.totalItems ?? 0,
    nextStartIndex: startIndex + items.length,
    hasMore: startIndex + items.length < (payload.totalItems ?? 0)
  };
}

// Les résultats de recherche ne renvoient souvent qu'une catégorie générique
// ("Fiction") ; la fiche du volume donne la catégorie complète
// ("Fiction / Fantasy / Epic"). Renvoie [] si Google Books est indisponible.
export async function fetchGoogleBookGenres(volumeId: string) {
  const url = new URL(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(volumeId)}`);
  url.searchParams.set("fields", "volumeInfo/categories");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  try {
    const response = await fetchWithTimeout(url, { next: { revalidate: 86_400 } }, 4_000);
    if (!response.ok) return [];
    const payload = (await response.json()) as Pick<GoogleVolume, "volumeInfo">;
    return genresFromCategories(payload.volumeInfo?.categories);
  } catch {
    return [];
  }
}
