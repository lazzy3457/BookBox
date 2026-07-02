import type { ExternalBookCandidate, ExternalBookSearchResult } from "@/server/services/externalBooks";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  edition_key?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  language?: string[];
  isbn?: string[];
};

type OpenLibraryResponse = {
  numFound?: number;
  docs?: OpenLibraryDoc[];
};

export const OPEN_LIBRARY_PAGE_SIZE = 24;
export const OPEN_LIBRARY_AUTHOR_PAGE_SIZE = 40;

type SearchOpenLibraryOptions = {
  mode?: "all" | "title" | "author" | "isbn";
  language?: string;
  pageSize?: number;
};

function normalizeLanguage(language?: string[]) {
  if (!language?.length) {
    return undefined;
  }

  const french = language.find((value) => ["fre", "fr", "fra"].includes(value.toLowerCase()));
  return french ?? language[0];
}

function coverUrl(doc: OpenLibraryDoc) {
  if (doc.cover_i) {
    return `${OPEN_LIBRARY_COVER_URL}/id/${doc.cover_i}-L.jpg`;
  }

  const isbn = doc.isbn?.[0];

  if (isbn) {
    return `${OPEN_LIBRARY_COVER_URL}/isbn/${isbn}-L.jpg`;
  }

  return undefined;
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}

function splitIsbn(isbn?: string[]) {
  const normalized = [...new Set((isbn ?? []).map(normalizeIsbn).filter(Boolean))];

  return {
    isbn10: normalized.filter((value) => value.length === 10),
    isbn13: normalized.filter((value) => value.length === 13)
  };
}

function normalizeOpenLibraryBook(doc: OpenLibraryDoc): ExternalBookCandidate | null {
  if (!doc.title) {
    return null;
  }

  const editionKey = doc.cover_edition_key ?? doc.edition_key?.[0];
  const openLibraryKey = editionKey ?? doc.key;

  if (!openLibraryKey) {
    return null;
  }

  const { isbn10, isbn13 } = splitIsbn(doc.isbn);

  return {
    externalId: `open-library:${openLibraryKey}`,
    source: "open_library",
    openLibraryKey,
    isbn10,
    isbn13,
    title: doc.title,
    authors: doc.author_name ?? [],
    thumbnailUrl: coverUrl(doc),
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    publisher: doc.publisher?.[0],
    pageCount: doc.number_of_pages_median,
    language: normalizeLanguage(doc.language)
  };
}

export async function searchOpenLibrary(query: string, startIndex = 0, options: SearchOpenLibraryOptions = {}): Promise<ExternalBookSearchResult> {
  const pageSize = Math.min(Math.max(options.pageSize ?? OPEN_LIBRARY_PAGE_SIZE, 1), 100);
  const page = Math.floor(startIndex / pageSize) + 1;
  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  const searchParam =
    options.mode === "author" ? "author" : options.mode === "title" ? "title" : options.mode === "isbn" ? "isbn" : "q";

  url.searchParams.set(searchParam, query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,cover_edition_key,edition_key,first_publish_year,publisher,number_of_pages_median,language,isbn"
  );

  if (options.language && options.language !== "all") {
    const language = options.language.toLowerCase();
    const languageCode = language.startsWith("fr") ? "fre" : language.startsWith("en") ? "eng" : language;
    url.searchParams.set("language", languageCode);
  }

  const response = await fetchWithTimeout(url, {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw Object.assign(new Error("La recherche Open Library est momentanement indisponible."), {
      status: 502,
      code: "OPEN_LIBRARY_UNAVAILABLE"
    });
  }

  const payload = (await response.json()) as OpenLibraryResponse;
  const items = (payload.docs ?? []).flatMap((doc) => {
    const book = normalizeOpenLibraryBook(doc);
    return book ? [book] : [];
  });
  const totalItems = payload.numFound ?? 0;
  const nextStartIndex = startIndex + items.length;

  return {
    items,
    totalItems,
    nextStartIndex,
    hasMore: nextStartIndex < totalItems
  };
}
