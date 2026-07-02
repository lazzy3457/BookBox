import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { GoogleBookCandidate } from "@/server/services/googleBooks";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";

const bookFields = new Set(Prisma.dmmf.datamodel.models.find((model) => model.name === "Book")?.fields.map((field) => field.name) ?? []);

function supportsBookField(field: "openLibraryKey" | "isbn10" | "isbn13") {
  return bookFields.has(field);
}

function normalizeIdentifiers(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.replace(/[^0-9X]/gi, "").toUpperCase()).filter(Boolean))];
}

function bookData(candidate: ExternalBookCandidate | GoogleBookCandidate) {
  const data = {
    googleBooksVolumeId: candidate.googleBooksVolumeId,
    title: candidate.title,
    authors: candidate.authors,
    description: candidate.description,
    thumbnailUrl: candidate.thumbnailUrl,
    publishedDate: candidate.publishedDate,
    publisher: candidate.publisher,
    pageCount: candidate.pageCount,
    language: candidate.language,
    source: candidate.source ?? (candidate.googleBooksVolumeId ? "google_books" : "open_library")
  };

  return {
    ...data,
    ...(supportsBookField("openLibraryKey") ? { openLibraryKey: candidate.openLibraryKey } : {}),
    ...(supportsBookField("isbn10") ? { isbn10: normalizeIdentifiers(candidate.isbn10) } : {}),
    ...(supportsBookField("isbn13") ? { isbn13: normalizeIdentifiers(candidate.isbn13) } : {})
  };
}

async function findExistingExternalBook(candidate: ExternalBookCandidate | GoogleBookCandidate) {
  if (candidate.googleBooksVolumeId) {
    const book = await prisma.book.findUnique({
      where: { googleBooksVolumeId: candidate.googleBooksVolumeId }
    });

    if (book) {
      return book;
    }
  }

  if (supportsBookField("openLibraryKey") && candidate.openLibraryKey) {
    const book = await prisma.book.findUnique({
      where: { openLibraryKey: candidate.openLibraryKey }
    });

    if (book) {
      return book;
    }
  }

  const isbn13 = normalizeIdentifiers(candidate.isbn13);

  if (supportsBookField("isbn13") && isbn13.length) {
    const book = await prisma.book.findFirst({
      where: { isbn13: { hasSome: isbn13 } }
    });

    if (book) {
      return book;
    }
  }

  const isbn10 = normalizeIdentifiers(candidate.isbn10);

  if (supportsBookField("isbn10") && isbn10.length) {
    return prisma.book.findFirst({
      where: { isbn10: { hasSome: isbn10 } }
    });
  }

  return null;
}

export async function upsertExternalBook(candidate: ExternalBookCandidate | GoogleBookCandidate) {
  const existingBook = await findExistingExternalBook(candidate);
  const data = bookData(candidate);

  if (existingBook) {
    const existingIdentifiers = existingBook as typeof existingBook & {
      openLibraryKey?: string | null;
      isbn10?: string[];
      isbn13?: string[];
    };
    const nextData = {
      ...data,
      googleBooksVolumeId: existingBook.googleBooksVolumeId ?? data.googleBooksVolumeId,
      ...(supportsBookField("openLibraryKey")
        ? { openLibraryKey: existingIdentifiers.openLibraryKey ?? data.openLibraryKey }
        : {}),
      ...(supportsBookField("isbn10")
        ? { isbn10: [...new Set([...(existingIdentifiers.isbn10 ?? []), ...(data.isbn10 ?? [])])] }
        : {}),
      ...(supportsBookField("isbn13")
        ? { isbn13: [...new Set([...(existingIdentifiers.isbn13 ?? []), ...(data.isbn13 ?? [])])] }
        : {})
    };

    return prisma.book.update({
      where: { id: existingBook.id },
      data: nextData
    });
  }

  return prisma.book.create({
    data
  });
}

export async function upsertGoogleBook(candidate: GoogleBookCandidate) {
  return upsertExternalBook({
    ...candidate,
    source: "google_books"
  });
}

export async function upsertOpenLibraryBook(candidate: ExternalBookCandidate) {
  return upsertExternalBook({
    ...candidate,
    source: "open_library"
  });
}

export async function createManualBook(input: {
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
}) {
  return prisma.book.create({
    data: {
      title: input.title,
      authors: input.authors,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      publishedDate: input.publishedDate,
      publisher: input.publisher,
      pageCount: input.pageCount,
      language: input.language,
      source: "manual"
    }
  });
}

export async function getBookDetails(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      reviews: {
        where: { hiddenAt: null, user: { suspendedAt: null } },
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          reactions: true,
          comments: {
            where: { hiddenAt: null, user: { suspendedAt: null } },
            include: { user: true, likes: true },
            orderBy: { createdAt: "asc" }
          }
        }
      },
      libraries: { where: { user: { suspendedAt: null } } }
    }
  });
}
