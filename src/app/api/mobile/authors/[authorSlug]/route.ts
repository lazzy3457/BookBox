import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { slugifyAuthor } from "@/lib/authors";
import { apiError, notFound } from "@/server/http/errors";

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

export async function GET(_: Request, { params }: { params: Promise<{ authorSlug: string }> }) {
  try {
    const { authorSlug } = await params;
    const allAuthorBooks = await prisma.book.findMany({
      where: {
        authors: { isEmpty: false }
      },
      include: {
        libraries: true,
        reviews: {
          where: { hiddenAt: null, user: { suspendedAt: null } },
          include: {
            user: true,
            reactions: true,
            comments: {
              where: { hiddenAt: null, user: { suspendedAt: null } },
              include: { user: true, likes: true },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    const books = allAuthorBooks.filter((book) => book.authors.some((author) => slugifyAuthor(author) === authorSlug));
    const authorName = books[0]?.authors.find((author) => slugifyAuthor(author) === authorSlug);

    if (!authorName) {
      throw notFound("Auteur introuvable.", "AUTHOR_NOT_FOUND");
    }

    const authorSummary = await getAuthorSummary(authorName);
    const reviews = books.flatMap((book) => book.reviews.map((review) => ({ ...review, book })));
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : null;
    const readerCount = new Set(books.flatMap((book) => book.libraries.map((entry) => entry.userId))).size;
    const mostReadBook = books.slice().sort((a, b) => b.libraries.length - a.libraries.length)[0] ?? null;

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
