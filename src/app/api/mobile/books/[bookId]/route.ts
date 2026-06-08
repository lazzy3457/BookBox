import { ReadingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError, notFound } from "@/server/http/errors";
import { getBookDetails } from "@/server/services/books";

export async function GET(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const { bookId } = await params;
    const book = await getBookDetails(bookId);

    if (!book) {
      throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
    }

    const [userBook, authorBooks, followingActivity] = await Promise.all([
      currentUserId
        ? prisma.userBook.findUnique({
            where: { userId_bookId: { userId: currentUserId, bookId: book.id } }
          })
        : Promise.resolve(null),
      book.authors.length
        ? prisma.book.findMany({
            where: {
              id: { not: book.id },
              authors: { hasSome: book.authors }
            },
            include: { reviews: true },
            take: 6
          })
        : Promise.resolve([]),
      currentUserId
        ? prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: {
              following: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  reviews: {
                    where: { bookId: book.id },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  },
                  library: {
                    where: { bookId: book.id },
                    take: 1
                  }
                }
              }
            },
            take: 6
          })
        : Promise.resolve([])
    ]);

    const averageRating = book.reviews.length
      ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
      : null;

    return NextResponse.json({
      book,
      userBook,
      currentUserReview: currentUserId ? book.reviews.find((review) => review.userId === currentUserId) ?? null : null,
      stats: {
        averageRating,
        reviews: book.reviews.length,
        readers: book.libraries.length,
        favorites: book.libraries.filter((entry) => entry.isFavorite).length,
        read: book.libraries.filter((entry) => entry.status === ReadingStatus.READ).length,
        reading: book.libraries.filter((entry) => entry.status === ReadingStatus.READING).length,
        toRead: book.libraries.filter((entry) => entry.status === ReadingStatus.TO_READ).length,
        abandoned: book.libraries.filter((entry) => entry.status === ReadingStatus.ABANDONED).length
      },
      authorBooks: authorBooks.map((entry) => ({
        ...entry,
        averageRating: entry.reviews.length
          ? entry.reviews.reduce((total, review) => total + review.rating, 0) / entry.reviews.length
          : null
      })),
      activeFollowing: followingActivity
        .map((follow) => follow.following)
        .filter((user) => user.reviews.length || user.library.length)
    });
  } catch (error) {
    return apiError(error);
  }
}
