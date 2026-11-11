import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { prisma } from "@/server/db/prisma";
import { findAuthorNames } from "@/server/services/authors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { searchExternalBooks } from "@/server/services/externalSearch";

type SourceFilter = "all" | "google_books" | "open_library";
type EditionFilter = "all" | "special" | "with_isbn" | "with_cover";

const SOURCES: SourceFilter[] = ["all", "google_books", "open_library"];
const EDITIONS: EditionFilter[] = ["all", "special", "with_isbn", "with_cover"];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function hasSpecialEditionSignal(book: ExternalBookCandidate) {
  const text = normalizeText([book.title, book.publisher, book.description].filter(Boolean).join(" "));
  return ["integrale", "epoque", "deluxe", "collector", "illustre", "illustrated", "omnibus"].some((word) => text.includes(word));
}

function matchesEdition(book: ExternalBookCandidate, edition: EditionFilter) {
  if (edition === "with_isbn") return (book.isbn10?.length ?? 0) > 0 || (book.isbn13?.length ?? 0) > 0;
  if (edition === "with_cover") return Boolean(book.thumbnailUrl);
  if (edition === "special") return hasSpecialEditionSignal(book);
  return true;
}

function cursor(value: string | null) {
  const parsed = Number(value ?? "0");
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function GET(request: Request, { params }: { params: Promise<{ authorSlug: string }> }) {
  try {
    // Chaque appel interroge Google Books et Open Library : même plafond que la recherche.
    await enforceRateLimit({
      scope: "author-external-books",
      identifier: getClientIdentifier(request),
      limit: 60,
      windowMs: 60_000
    });
    const { authorSlug } = await params;
    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(Math.max(1, Math.trunc(Number(searchParams.get("pageSize") ?? "10")) || 10), 20);
    const sourceParam = (searchParams.get("source") ?? "all") as SourceFilter;
    const editionParam = (searchParams.get("edition") ?? "all") as EditionFilter;
    const source = SOURCES.includes(sourceParam) ? sourceParam : "all";
    const edition = EDITIONS.includes(editionParam) ? editionParam : "all";
    const language = (searchParams.get("language") ?? "all").slice(0, 24);
    const authorNames = await findAuthorNames(authorSlug);
    const authorName = authorNames[0];

    if (!authorName) {
      throw Object.assign(new Error("Auteur introuvable."), { status: 404, code: "AUTHOR_NOT_FOUND" });
    }

    // Les livres de l'auteur déjà sur BooksBox sont affichés plus haut dans la
    // page : on ne les propose pas une seconde fois.
    const authorBooks = await prisma.book.findMany({
      where: { authors: { hasSome: authorNames } },
      select: { googleBooksVolumeId: true, openLibraryKey: true }
    });
    const existingGoogleIds = new Set(authorBooks.map((book) => book.googleBooksVolumeId));
    const existingOpenLibraryKeys = new Set(authorBooks.map((book) => book.openLibraryKey));

    const result = await searchExternalBooks({
      query: authorName,
      mode: "author",
      language,
      source,
      pageSize,
      // Un curseur par source, comme la recherche : rien n'est sauté entre deux pages.
      googleStart: cursor(searchParams.get("googleStart")),
      openLibraryStart: cursor(searchParams.get("openLibraryStart")),
      keep: (book) =>
        !(book.googleBooksVolumeId && existingGoogleIds.has(book.googleBooksVolumeId))
        && !(book.openLibraryKey && existingOpenLibraryKeys.has(book.openLibraryKey))
        && matchesEdition(book, edition),
      logLabel: "authors/books"
    });

    return NextResponse.json(result);
  } catch (error) {
    if ((error as { code?: string }).code === "BOOK_SEARCH_UNAVAILABLE") {
      return apiError(Object.assign(new Error("Les éditions externes sont momentanément indisponibles."), {
        status: 502,
        code: "AUTHOR_EXTERNAL_BOOKS_UNAVAILABLE"
      }));
    }
    return apiError(error);
  }
}
