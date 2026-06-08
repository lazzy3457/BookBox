export type ExternalBookSource = "google_books" | "open_library";

export type ExternalBookCandidate = {
  externalId?: string;
  source?: ExternalBookSource;
  googleBooksVolumeId?: string;
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
};

export type ExternalBookSearchResult = {
  items: ExternalBookCandidate[];
  totalItems: number;
  nextStartIndex: number;
  hasMore: boolean;
};

export function dedupeExternalBooks(items: ExternalBookCandidate[]) {
  const seen = new Set<string>();

  return items.filter((book) => {
    const editionSignature = [
      book.source,
      book.googleBooksVolumeId,
      book.openLibraryKey,
      book.title.toLowerCase(),
      book.authors.join(",").toLowerCase(),
      book.publisher?.toLowerCase(),
      book.publishedDate,
      book.pageCount,
      book.language
    ]
      .filter(Boolean)
      .join("|");

    if (seen.has(editionSignature)) {
      return false;
    }

    seen.add(editionSignature);
    return true;
  });
}
