import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { prisma } from "@/server/db/prisma";
import { slugifyAuthor } from "@/lib/authors";
import { dedupeExternalBooks } from "@/server/services/externalBooks";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { searchGoogleBooks } from "@/server/services/googleBooks";
import { searchOpenLibrary } from "@/server/services/openLibrary";

const MAX_AUTHOR_RESULTS = 200;

type SourceFilter = "all" | "google_books" | "open_library";
type EditionFilter = "all" | "special" | "with_isbn" | "with_cover";

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasSpecialEditionSignal(book: ExternalBookCandidate) {
  const text = normalizeText([book.title, book.publisher, book.description].filter(Boolean).join(" "));
  return ["integrale", "epoque", "deluxe", "collector", "illustre", "illustrated", "omnibus"].some((word) => text.includes(word));
}

function filterEditions(items: ExternalBookCandidate[], edition: EditionFilter) {
  if (edition === "with_isbn") {
    return items.filter((book) => (book.isbn10?.length ?? 0) > 0 || (book.isbn13?.length ?? 0) > 0);
  }

  if (edition === "with_cover") {
    return items.filter((book) => Boolean(book.thumbnailUrl));
  }

  if (edition === "special") {
    return items.filter(hasSpecialEditionSignal);
  }

  return items;
}

export async function GET(request: Request, { params }: { params: Promise<{ authorSlug: string }> }) {
  try {
    const { authorSlug } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(Math.max(1, Number(searchParams.get("pageSize") ?? "10")), 20);
    const source = (searchParams.get("source") ?? "all") as SourceFilter;
    const language = searchParams.get("language") ?? "all";
    const edition = (searchParams.get("edition") ?? "all") as EditionFilter;
    const startIndex = (page - 1) * pageSize;
    const allAuthorBooks = await prisma.book.findMany({
      where: { authors: { isEmpty: false } },
      select: { authors: true, googleBooksVolumeId: true }
    });
    const authorName = allAuthorBooks
      .flatMap((book) => book.authors)
      .find((author) => slugifyAuthor(author) === authorSlug);

    if (!authorName) {
      throw Object.assign(new Error("Auteur introuvable."), { status: 404, code: "AUTHOR_NOT_FOUND" });
    }

    const existingGoogleIds = new Set(
      allAuthorBooks.flatMap((book) =>
        book.authors.some((author) => slugifyAuthor(author) === authorSlug) && book.googleBooksVolumeId
          ? [book.googleBooksVolumeId]
          : []
      )
    );
    const [googleResult, openLibraryResult] = await Promise.allSettled([
      source === "open_library"
        ? Promise.resolve({ items: [], totalItems: 0, nextStartIndex: startIndex, hasMore: false })
        : searchGoogleBooks(authorName, startIndex, { mode: "author", language, pageSize }),
      source === "google_books"
        ? Promise.resolve({ items: [], totalItems: 0, nextStartIndex: startIndex, hasMore: false })
        : searchOpenLibrary(authorName, startIndex, { mode: "author", language, pageSize })
    ]);
    const googleBooks = googleResult.status === "fulfilled" ? googleResult.value : null;
    const openLibrary = openLibraryResult.status === "fulfilled" ? openLibraryResult.value : null;
    const mergedItems = dedupeExternalBooks(interleaveResults(googleBooks?.items ?? [], openLibrary?.items ?? []))
      .filter((book) => !book.googleBooksVolumeId || !existingGoogleIds.has(book.googleBooksVolumeId));
    const items = filterEditions(mergedItems, edition).slice(0, pageSize);
    const rawTotalItems = (googleBooks?.totalItems ?? 0) + (openLibrary?.totalItems ?? 0);
    const totalItems = Math.min(rawTotalItems || startIndex + items.length, MAX_AUTHOR_RESULTS);
    const hasMore = startIndex + items.length < totalItems && items.length === pageSize;

    if (!googleBooks && !openLibrary) {
      throw Object.assign(new Error("Les editions externes sont momentanement indisponibles."), {
        status: 502,
        code: "AUTHOR_EXTERNAL_BOOKS_UNAVAILABLE"
      });
    }

    return NextResponse.json({
      items,
      page,
      pageSize,
      totalItems,
      hasMore
    });
  } catch (error) {
    return apiError(error);
  }
}
