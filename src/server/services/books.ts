import { publicUserSelect } from "@/server/db/selects";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { GoogleBookCandidate } from "@/server/services/googleBooks";
import { MAX_EDITION_ISBNS, normalizeLanguageCode } from "@/server/services/externalBooks";
import type { ExternalBookCandidate } from "@/server/services/externalBooks";
import { fetchGoogleBookDetails } from "@/server/services/googleBooks";
import { normalizeGenres } from "@/lib/genres";
import { conflict, notFound } from "@/server/http/errors";

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
    language: normalizeLanguageCode(candidate.language),
    genres: normalizeGenres(candidate.genres),
    source: candidate.source ?? (candidate.googleBooksVolumeId ? "google_books" : "open_library")
  };

  return {
    ...data,
    ...(supportsBookField("openLibraryKey") ? { openLibraryKey: candidate.openLibraryKey } : {}),
    ...(supportsBookField("isbn10") ? { isbn10: normalizeIdentifiers(candidate.isbn10).slice(0, MAX_STORED_ISBNS) } : {}),
    ...(supportsBookField("isbn13") ? { isbn13: normalizeIdentifiers(candidate.isbn13).slice(0, MAX_STORED_ISBNS) } : {})
  };
}

type StoredIdentifiers = { openLibraryKey?: string | null; isbn10?: string[]; isbn13?: string[] };

// Un ISBN ne désigne une édition que si la liste n'en mélange pas plusieurs.
// Côté candidat : au plus MAX_EDITION_ISBNS par type. Côté livre en base : une
// fiche qui porte des dizaines d'ISBN (anciens imports Open Library faits au
// niveau de l'œuvre) correspondrait à n'importe quelle édition, on l'écarte.
const MAX_STORED_ISBNS = 20;
const MAX_TRUSTED_STORED_ISBNS = MAX_EDITION_ISBNS * 2;

async function findByIsbn(field: "isbn10" | "isbn13", values: string[]) {
  if (!supportsBookField(field) || !values.length || values.length > MAX_EDITION_ISBNS) {
    return null;
  }

  const matches = await prisma.book.findMany({
    where: { [field]: { hasSome: values } },
    orderBy: { createdAt: "asc" },
    take: 5
  });

  return matches.find((book) => ((book as StoredIdentifiers)[field]?.length ?? 0) <= MAX_TRUSTED_STORED_ISBNS) ?? null;
}

// Rapprochement : d'abord l'identifiant de la source (sûr), puis l'ISBN
// seulement quand il désigne une seule édition.
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

  return (await findByIsbn("isbn13", normalizeIdentifiers(candidate.isbn13)))
    ?? findByIsbn("isbn10", normalizeIdentifiers(candidate.isbn10));
}

function mergeIsbns(existing: string[] | undefined, incoming: string[] | undefined) {
  return [...new Set([...(existing ?? []), ...(incoming ?? [])])].slice(0, MAX_STORED_ISBNS);
}

export async function upsertExternalBook(candidate: ExternalBookCandidate | GoogleBookCandidate) {
  const existingBook = await findExistingExternalBook(candidate);
  const data = bookData(candidate);

  // La fiche Google du volume complète ce que la liste de résultats ne donne
  // pas : genres précis, nombre de pages (sans lui, pas de pourcentage de
  // lecture), éditeur. Appelée seulement s'il manque quelque chose.
  const pageCountKnown = existingBook?.pageCount ?? data.pageCount;
  const publisherKnown = existingBook?.publisher ?? data.publisher;
  if (data.googleBooksVolumeId && (!existingBook?.genres.length || !pageCountKnown || !publisherKnown)) {
    const details = await fetchGoogleBookDetails(data.googleBooksVolumeId);
    if (details.genres.length && !existingBook?.genres.length) data.genres = details.genres;
    data.pageCount ??= details.pageCount;
    data.publisher ??= details.publisher;
  }

  if (existingBook) {
    const existingIdentifiers = existingBook as typeof existingBook & StoredIdentifiers;
    // La fiche en base fait foi : on complète ses champs vides, sans jamais
    // remplacer un titre, une couverture ou un éditeur déjà renseignés.
    const nextData = {
      authors: existingBook.authors.length ? existingBook.authors : data.authors,
      description: existingBook.description ?? data.description,
      thumbnailUrl: existingBook.thumbnailUrl ?? data.thumbnailUrl,
      publishedDate: existingBook.publishedDate ?? data.publishedDate,
      publisher: existingBook.publisher ?? data.publisher,
      pageCount: existingBook.pageCount ?? data.pageCount,
      language: existingBook.language ?? data.language,
      googleBooksVolumeId: existingBook.googleBooksVolumeId ?? data.googleBooksVolumeId,
      genres: existingBook.genres.length ? existingBook.genres : data.genres,
      ...(supportsBookField("openLibraryKey")
        ? { openLibraryKey: existingIdentifiers.openLibraryKey ?? data.openLibraryKey }
        : {}),
      ...(supportsBookField("isbn10") ? { isbn10: mergeIsbns(existingIdentifiers.isbn10, data.isbn10) } : {}),
      ...(supportsBookField("isbn13") ? { isbn13: mergeIsbns(existingIdentifiers.isbn13, data.isbn13) } : {})
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
  genres?: string[];
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
      genres: normalizeGenres(input.genres),
      source: "manual"
    }
  });
}

// La fiche d'un livre est partagée par tous ses lecteurs. Un lecteur ne peut
// que renseigner un nombre de pages manquant, pour un livre de sa
// bibliothèque ; seul un admin peut corriger un nombre déjà renseigné.
export async function setBookPageCount(input: { userId: string; bookId: string; pageCount: number; isAdmin: boolean }) {
  const { userId, bookId, pageCount, isAdmin } = input;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { pageCount: true, libraries: { where: { userId }, select: { id: true } } }
  });

  if (!book) {
    throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
  }

  if (isAdmin) {
    await prisma.book.update({ where: { id: bookId }, data: { pageCount } });
    if (book.pageCount && book.pageCount !== pageCount) await recomputeReadingPercentages(bookId, pageCount);
    return { id: bookId, pageCount };
  }

  if (!book.libraries.length) {
    throw notFound("Ce livre n'est pas dans ta bibliothèque.", "BOOK_NOT_IN_LIBRARY");
  }

  // La condition sur pageCount évite qu'un second envoi simultané écrase le premier.
  const { count } = book.pageCount
    ? { count: 0 }
    : await prisma.book.updateMany({ where: { id: bookId, pageCount: null }, data: { pageCount } });

  if (!count) {
    throw conflict("Le nombre de pages de ce livre est déjà renseigné.", "PAGE_COUNT_ALREADY_SET");
  }

  return { id: bookId, pageCount };
}

// Le pourcentage d'une page notée est figé à l'enregistrement, d'après le
// nombre de pages de l'époque : après une correction, on le recalcule pour
// toutes les pages notées de ce livre (les citations n'en ont pas).
async function recomputeReadingPercentages(bookId: string, pageCount: number) {
  const entries = await prisma.readingEntry.findMany({
    where: { kind: "NOTE", page: { not: null }, period: { userBook: { bookId } } },
    select: { id: true, page: true }
  });
  const idsByPercentage = new Map<number, string[]>();

  entries.forEach((entry) => {
    const percentage = Math.min(100, Math.round(((entry.page ?? 0) / pageCount) * 100));
    idsByPercentage.set(percentage, [...(idsByPercentage.get(percentage) ?? []), entry.id]);
  });

  for (const [percentage, ids] of idsByPercentage) {
    await prisma.readingEntry.updateMany({ where: { id: { in: ids } }, data: { percentage } });
  }
}

export async function getBookDetails(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      reviews: {
        where: { chapter: 0, hiddenAt: null, user: { suspendedAt: null } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: publicUserSelect },
          reactions: true,
          comments: {
            where: { hiddenAt: null, user: { suspendedAt: null } },
            include: { user: { select: publicUserSelect }, likes: true },
            orderBy: { createdAt: "asc" }
          }
        }
      },
      libraries: { where: { user: { suspendedAt: null } } }
    }
  });
}
