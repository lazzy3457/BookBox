import { MAX_EDITION_ISBNS, isManga, sanitizeExternalBook } from "@/server/services/externalBooks";
import type { ExternalBookCandidate, ExternalBookSearchResult } from "@/server/services/externalBooks";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";
import { genresFromCategories } from "@/lib/genres";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b";

// Un doc de /search.json est une ŒUVRE : son éditeur, ses ISBN, ses langues et
// son nombre de pages mélangent toutes les éditions. On ne lit donc au niveau
// de l'œuvre que le titre, les auteurs, l'année, la couverture et les sujets ;
// le reste vient de l'édition qu'Open Library juge la plus pertinente
// (champs `editions.*`, orientée par le paramètre `lang`).
const OPEN_LIBRARY_FIELDS = [
  "key", "title", "author_name", "cover_i", "first_publish_year", "subject",
  "editions", "editions.key", "editions.title", "editions.publisher", "editions.isbn",
  "editions.language", "editions.number_of_pages", "editions.publish_date", "editions.cover_i"
].join(",");

type OpenLibraryEdition = {
  key?: string;
  title?: string;
  publisher?: string[];
  isbn?: string[];
  language?: string[];
  number_of_pages?: number;
  publish_date?: string[];
  cover_i?: number;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  editions?: { docs?: OpenLibraryEdition[] };
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

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}

// ISBN d'UNE édition : un ISBN-10 et un ISBN-13 en général, jamais la liste
// de toute l'œuvre.
function splitIsbn(isbn?: string[]) {
  const normalized = [...new Set((isbn ?? []).map(normalizeIsbn).filter(Boolean))];

  return {
    isbn10: normalized.filter((value) => value.length === 10).slice(0, MAX_EDITION_ISBNS),
    isbn13: normalized.filter((value) => value.length === 13).slice(0, MAX_EDITION_ISBNS)
  };
}

// Les dates d'édition sont libres ("11 Janvier 2001", "2007-12-07") : on n'en
// garde que l'année.
function editionYear(dates?: string[]) {
  return dates?.map((date) => date.match(/\b(1[4-9]\d\d|20\d\d)\b/)?.[1]).find(Boolean);
}

export function normalizeOpenLibraryBook(doc: OpenLibraryDoc): ExternalBookCandidate | null {
  const edition = doc.editions?.docs?.[0];
  const title = (edition?.title ?? doc.title)?.trim();
  // "/books/OL123M" → "OL123M" ; sans édition, on retombe sur la clé d'œuvre.
  const openLibraryKey = edition?.key?.replace(/^\/books\//, "") ?? doc.key;

  if (!title || !openLibraryKey) {
    return null;
  }

  const coverId = edition?.cover_i ?? doc.cover_i;
  const year = editionYear(edition?.publish_date) ?? (doc.first_publish_year ? String(doc.first_publish_year) : undefined);

  const book = sanitizeExternalBook({
    externalId: `open-library:${openLibraryKey}`,
    source: "open_library" as const,
    openLibraryKey,
    ...splitIsbn(edition?.isbn),
    title,
    authors: doc.author_name ?? [],
    thumbnailUrl: coverId ? `${OPEN_LIBRARY_COVER_URL}/id/${coverId}-L.jpg` : undefined,
    publishedDate: year,
    publisher: edition?.publisher?.[0],
    pageCount: edition?.number_of_pages,
    language: edition?.language?.[0],
    genres: genresFromCategories(doc.subject)
  });

  return book.title ? book : null;
}

export async function searchOpenLibrary(query: string, startIndex = 0, options: SearchOpenLibraryOptions = {}): Promise<ExternalBookSearchResult> {
  const pageSize = Math.min(Math.max(options.pageSize ?? OPEN_LIBRARY_PAGE_SIZE, 1), 100);
  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  const searchParam =
    options.mode === "author" ? "author" : options.mode === "title" ? "title" : options.mode === "isbn" ? "isbn" : "q";
  const language = options.language && options.language !== "all" ? options.language.toLowerCase() : null;

  url.searchParams.set(searchParam, query);
  // `offset` plutôt que `page` : la reprise se fait à un index quelconque.
  url.searchParams.set("offset", String(startIndex));
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("fields", OPEN_LIBRARY_FIELDS);
  // Édition préférée : la langue demandée, sinon le français.
  url.searchParams.set("lang", language ? language.slice(0, 2) : "fr");

  if (language) {
    const languageCode = language.startsWith("fr") ? "fre" : language.startsWith("en") ? "eng" : language;
    url.searchParams.set("language", languageCode);
  }

  const response = await fetchWithTimeout(url, {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw Object.assign(new Error("La recherche Open Library est momentanement indisponible."), {
      status: 502,
      code: "OPEN_LIBRARY_UNAVAILABLE",
      upstreamStatus: response.status
    });
  }

  const payload = (await response.json()) as OpenLibraryResponse;
  const docs = payload.docs ?? [];
  const items: ExternalBookCandidate[] = [];
  const positions: number[] = [];
  const mangaTitles: string[] = [];

  // Les mangas sont écartés sur les sujets de l'œuvre, avant toute pagination.
  docs.forEach((doc, index) => {
    if (isManga({ categories: doc.subject, publisher: doc.editions?.docs?.[0]?.publisher?.[0] })) {
      if (doc.title) mangaTitles.push(doc.title);
      return;
    }
    const book = normalizeOpenLibraryBook(doc);
    if (!book) return;
    items.push(book);
    positions.push(startIndex + index);
  });

  const totalItems = payload.numFound ?? 0;
  const nextStartIndex = startIndex + docs.length;

  return {
    items,
    positions,
    mangaTitles,
    totalItems,
    nextStartIndex,
    hasMore: docs.length > 0 && nextStartIndex < totalItems
  };
}
