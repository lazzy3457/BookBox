import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export async function getTrendingBooks() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  try {
    const books = await prisma.book.findMany({
      include: {
        libraries: {
          where: {
            updatedAt: { gte: since },
            status: { in: [ReadingStatus.READ, ReadingStatus.TO_READ] }
          }
        },
        reviews: {
          where: { createdAt: { gte: since } },
          include: { reactions: true }
        }
      },
      take: 50
    });

    return books
      .map((book) => {
        const readScore = book.libraries.filter((entry) => entry.status === ReadingStatus.READ).length * 3;
        const toReadScore = book.libraries.filter((entry) => entry.status === ReadingStatus.TO_READ).length * 2;
        const reviewScore = book.reviews.length * 4;
        const reactionScore = book.reviews.reduce((total, review) => total + review.reactions.length, 0);

        return {
          ...book,
          score: readScore + toReadScore + reviewScore + reactionScore,
          averageRating:
            book.reviews.length > 0
              ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
              : null
        };
      })
      .filter((book) => book.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Trending unavailable until the database is reachable.", error);
      return [];
    }

    throw error;
  }
}
