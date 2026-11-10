import { publicUserSelect } from "@/server/db/selects";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { findAuthorNames } from "@/server/services/authors";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";

type AuthorSummary = {
  extract?: string;
  thumbnail?: {
    source?: string;
  };
};

async function getAuthorSummary(authorName: string) {
  const candidates = [
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { next: { revalidate: 604800 } });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as AuthorSummary;

      if (payload.extract || payload.thumbnail?.source) {
        return {
          bio: payload.extract ?? null,
          image: payload.thumbnail?.source ?? null
        };
      }
    } catch {
      continue;
    }
  }

  return {
    bio: null,
    image: null
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ authorSlug: string }> }) {
  try {
    await enforceRateLimit({ scope: "mobile-author", identifier: getClientIdentifier(request), limit: 60, windowMs: 60_000 });
    const { authorSlug } = await params;
    const authorNames = await findAuthorNames(authorSlug);
    const authorName = authorNames[0];

    if (!authorName) {
      throw notFound("Auteur introuvable.", "AUTHOR_NOT_FOUND");
    }

    const authorBooks = await prisma.book.findMany({
      where: {
        authors: { hasSome: authorNames }
      },
      include: {
        libraries: { where: { user: { suspendedAt: null } }, select: { userId: true } },
        reviews: {
          where: { chapter: 0, hiddenAt: null, user: { suspendedAt: null } },
          include: {
            user: { select: publicUserSelect },
            reactions: true,
            comments: {
              where: { hiddenAt: null, deletedAt: null, user: { suspendedAt: null } },
              include: { user: { select: publicUserSelect }, likes: true },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    // Les bibliothèques ne servent qu'aux compteurs : elles ne partent pas dans la réponse.
    const books = authorBooks.map(({ libraries, ...book }) => ({ ...book, readerIds: libraries.map((entry) => entry.userId) }));
    const withoutReaders = ({ readerIds: _readerIds, ...book }: (typeof books)[number]) => book;

    const authorSummary = await getAuthorSummary(authorName);
    const reviews = books.flatMap((book) => book.reviews.map((review) => ({ ...review, book: withoutReaders(book) })));
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : null;
    const readerCount = new Set(books.flatMap((book) => book.readerIds)).size;
    const mostRead = books.slice().sort((a, b) => b.readerIds.length - a.readerIds.length)[0];
    const mostReadBook = mostRead ? withoutReaders(mostRead) : null;

    return NextResponse.json({
      author: {
        name: authorName,
        slug: authorSlug,
        ...authorSummary
      },
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        authors: book.authors,
        thumbnailUrl: book.thumbnailUrl,
        publishedDate: book.publishedDate,
        averageRating: book.reviews.length
          ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
          : null
      })),
      stats: {
        books: books.length,
        averageRating,
        reviews: reviews.length,
        readers: readerCount
      },
      mostReadBook,
      recentReviews: reviews.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4)
    });
  } catch (error) {
    return apiError(error);
  }
}
