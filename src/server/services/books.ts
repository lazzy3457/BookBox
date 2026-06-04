import { prisma } from "@/server/db/prisma";
import type { GoogleBookCandidate } from "@/server/services/googleBooks";

export async function upsertGoogleBook(candidate: GoogleBookCandidate) {
  return prisma.book.upsert({
    where: {
      googleBooksVolumeId: candidate.googleBooksVolumeId
    },
    update: {
      title: candidate.title,
      authors: candidate.authors,
      description: candidate.description,
      thumbnailUrl: candidate.thumbnailUrl,
      publishedDate: candidate.publishedDate,
      publisher: candidate.publisher,
      pageCount: candidate.pageCount,
      language: candidate.language,
      source: "google_books"
    },
    create: {
      googleBooksVolumeId: candidate.googleBooksVolumeId,
      title: candidate.title,
      authors: candidate.authors,
      description: candidate.description,
      thumbnailUrl: candidate.thumbnailUrl,
      publishedDate: candidate.publishedDate,
      publisher: candidate.publisher,
      pageCount: candidate.pageCount,
      language: candidate.language,
      source: "google_books"
    }
  });
}

export async function createManualBook(input: {
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
}) {
  return prisma.book.create({
    data: {
      title: input.title,
      authors: input.authors,
      description: input.description,
      publishedDate: input.publishedDate,
      source: "manual"
    }
  });
}

export async function getBookDetails(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          reactions: true,
          comments: {
            include: { user: true, likes: true },
            orderBy: { createdAt: "asc" }
          }
        }
      },
      libraries: true
    }
  });
}
