import { googleBookUpsertSchema } from "@/server/validation/books";
import { isManga, sanitizeExternalBook } from "@/server/services/externalBooks";
import type { ExternalBookCandidate, ExternalBookSearchResult } from "@/server/services/externalBooks";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";
import { genresFromCategories } from "@/lib/genres";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export type GoogleBookCandidate = {
  externalId?: string;
  source?: "google_books";
  googleBooksVolumeId: string;
  openLibraryKey?: string;
  openLibraryWorkKey?: string;
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

// Renvoie null pour un volume inutilisable (sans identifiant, par exemple) :
// l'appelant l'ignore sans perdre le reste de la page.
export function normalizeGoogleBook(item: GoogleVolume) {
  const volume = item.volumeInfo ?? {};
  const parsedBook = googleBookUpsertSchema.safeParse(sanitizeExternalBook({
    googleBooksVolumeId: item.id,
    title: volume.title?.trim() || "Titre inconnu",
    authors: volume.authors ?? [],
    description: volume.description,
    thumbnailUrl: volume.imageLinks?.thumbnail?.replace("http://", "https://") ?? volume.imageLinks?.smallThumbnail,
    publishedDate: volume.publishedDate,
    publisher: volume.publisher,
    // Google renvoie souvent pageCount: 0 quand il ne connaît pas la pagination.
    pageCount: volume.pageCount,
    language: volume.language,
    genres: genresFromCategories(volume.categories),
    isbn10: isbnByType(volume.industryIdentifiers, "ISBN_10"),
    isbn13: isbnByType(volume.industryIdentifiers, "ISBN_13")
  }));

  if (!parsedBook.success) {
    return null;
  }

  return {
    ...parsedBook.data,
    externalId: `google-books:${item.id}`,
    source: "google_books" as const
  } satisfies ExternalBookCandidate;
}

export async function searchGoogleBooks(query: string, startIndex = 0, options: SearchGoogleBooksOptions = {}): Promise<ExternalBookSearchResult> {
  const pageSize = Math.min(Math.max(options.pageSize ?? GOOGLE_BOOKS_PAGE_SIZE, 1), 40);
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", buildGoogleBooksQuery(query, options.mode ?? "all"));
  url.searchParams.set("maxResults", String(pageSize));
  url.searchParams.set("startIndex", String(startIndex));
  url.searchParams.set("printType", "books");

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
      code: "GOOGLE_BOOKS_UNAVAILABLE",
      // 429 : quota dépassé. Sert au journal serveur, pas à la réponse.
      upstreamStatus: response.status
    });
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  const volumes = payload.items ?? [];
  const items: ExternalBookCandidate[] = [];
  const positions: number[] = [];
  const mangaTitles: string[] = [];

  // Chaque volume est validé séparément : un seul volume invalide ne fait plus
  // tomber la page entière. Les mangas sont écartés ici, sur les catégories
  // brutes, avant toute pagination.
  volumes.forEach((volume, index) => {
    if (isManga({ categories: volume.volumeInfo?.categories, publisher: volume.volumeInfo?.publisher })) {
      if (volume.volumeInfo?.title) mangaTitles.push(volume.volumeInfo.title);
      return;
    }
    const book = normalizeGoogleBook(volume);
    if (!book) return;
    items.push(book);
    positions.push(startIndex + index);
  });

  const totalItems = payload.totalItems ?? 0;
  const nextStartIndex = startIndex + volumes.length;

  return {
    items,
    positions,
    mangaTitles,
    totalItems,
    nextStartIndex,
    hasMore: volumes.length > 0 && nextStartIndex < totalItems
  };
}

// Une liste de résultats est moins complète que la fiche du volume : catégorie
// générique ("Fiction" au lieu de "Fiction / Fantasy / Epic"), et souvent ni
// éditeur ni nombre de pages (pageCount: 0). On lit donc la fiche au moment
// d'enregistrer le livre. Renvoie des champs vides si Google est indisponible.
export async function fetchGoogleBookDetails(volumeId: string) {
  const url = new URL(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(volumeId)}`);
  url.searchParams.set("fields", "volumeInfo(categories,pageCount,printedPageCount,publisher)");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  try {
    const response = await fetchWithTimeout(url, { next: { revalidate: 86_400 } }, 4_000);
    if (!response.ok) return { genres: [] };
    const { volumeInfo } = (await response.json()) as { volumeInfo?: GoogleVolume["volumeInfo"] & { printedPageCount?: number } };
    const { pageCount, publisher } = sanitizeExternalBook({
      title: "",
      authors: [],
      pageCount: volumeInfo?.pageCount || volumeInfo?.printedPageCount,
      publisher: volumeInfo?.publisher
    });
    return { genres: genresFromCategories(volumeInfo?.categories), pageCount, publisher };
  } catch {
    return { genres: [] };
  }
}
