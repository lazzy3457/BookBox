import { googleBookUpsertSchema } from "@/server/validation/books";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export type GoogleBookCandidate = {
  googleBooksVolumeId: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
};

type GoogleBooksResponse = {
  totalItems?: number;
  items?: Array<{
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
    };
  }>;
};

export const GOOGLE_BOOKS_PAGE_SIZE = 12;

export function normalizeGoogleBook(item: NonNullable<GoogleBooksResponse["items"]>[number]) {
  const volume = item.volumeInfo ?? {};

  return googleBookUpsertSchema.parse({
    googleBooksVolumeId: item.id,
    title: volume.title ?? "Titre inconnu",
    authors: volume.authors ?? [],
    description: volume.description,
    thumbnailUrl: volume.imageLinks?.thumbnail?.replace("http://", "https://") ?? volume.imageLinks?.smallThumbnail,
    publishedDate: volume.publishedDate,
    publisher: volume.publisher,
    pageCount: volume.pageCount,
    language: volume.language
  });
}

export async function searchGoogleBooks(query: string, startIndex = 0) {
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(GOOGLE_BOOKS_PAGE_SIZE));
  url.searchParams.set("startIndex", String(startIndex));
  url.searchParams.set("langRestrict", "fr");
  url.searchParams.set("printType", "books");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const response = await fetch(url, {
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
