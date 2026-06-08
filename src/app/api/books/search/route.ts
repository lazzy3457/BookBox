import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { searchGoogleBooks } from "@/server/services/googleBooks";
import { dedupeExternalBooks } from "@/server/services/externalBooks";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { searchOpenLibrary } from "@/server/services/openLibrary";
import { searchBooksSchema } from "@/server/validation/books";

const MAX_SEARCH_RESULTS = 200;

function interleaveResults(first: ExternalBookCandidate[], second: ExternalBookCandidate[]) {
  const items: ExternalBookCandidate[] = [];
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    if (first[index]) {
      items.push(first[index]);
    }
    if (second[index]) {
      items.push(second[index]);
    }
  }

  return items;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { q, startIndex, pageSize, mode, language, source } = searchBooksSchema.parse({
      q: searchParams.get("q") ?? "",
      startIndex: searchParams.get("startIndex") ?? "0",
      pageSize: searchParams.get("pageSize") ?? "10",
      mode: searchParams.get("mode") ?? "all",
      language: searchParams.get("language") ?? "all",
      source: searchParams.get("source") ?? "all"
    });
    const [googleResult, openLibraryResult] = await Promise.allSettled([
      source === "open_library"
        ? Promise.resolve({ items: [], totalItems: 0, nextStartIndex: startIndex, hasMore: false })
        : searchGoogleBooks(q, startIndex, { mode, language, pageSize }),
      source === "google_books"
        ? Promise.resolve({ items: [], totalItems: 0, nextStartIndex: startIndex, hasMore: false })
        : searchOpenLibrary(q, startIndex, { mode, language, pageSize })
    ]);
    const googleBooks = googleResult.status === "fulfilled" ? googleResult.value : null;
    const openLibrary = openLibraryResult.status === "fulfilled" ? openLibraryResult.value : null;
    const items = dedupeExternalBooks(interleaveResults(googleBooks?.items ?? [], openLibrary?.items ?? [])).slice(0, pageSize);
    const rawTotalItems = (googleBooks?.totalItems ?? 0) + (openLibrary?.totalItems ?? 0);
    const cappedTotalItems = Math.min(rawTotalItems || startIndex + items.length, MAX_SEARCH_RESULTS);
    const hasMore = startIndex + items.length < cappedTotalItems && items.length === pageSize;
    const totalItems = cappedTotalItems;
    const nextStartIndex = startIndex + pageSize;

    if (!googleBooks && !openLibrary) {
      throw Object.assign(new Error("La recherche de livres est momentanement indisponible."), {
        status: 502,
        code: "BOOK_SEARCH_UNAVAILABLE"
      });
    }

    return NextResponse.json({
      items,
      totalItems,
      nextStartIndex,
      hasMore,
      pageSize
    });
  } catch (error) {
    return apiError(error);
  }
}
