import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";

export type Recommendation = {
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    publishedDate: string | null;
    pageCount: number | null;
  };
  score: number;
  reason: string;
};

export async function getRecommendations(userId: string, limit = 8): Promise<Recommendation[]> {
  const blockedUserIds = await getBlockedUserIds(userId);
  const [library, reviews, dismissed, books] = await Promise.all([
    prisma.userBook.findMany({ where: { userId }, include: { book: true } }),
    prisma.review.findMany({ where: { userId, hiddenAt: null } }),
    prisma.recommendationDismissal.findMany({ where: { userId }, select: { bookId: true } }),
    prisma.book.findMany({
      include: {
        libraries: {
          where: { ...(blockedUserIds.length ? { userId: { notIn: blockedUserIds } } : {}), user: { suspendedAt: null } },
          select: { userId: true, status: true, isFavorite: true }
        },
        reviews: {
          where: { ...(blockedUserIds.length ? { userId: { notIn: blockedUserIds } } : {}), hiddenAt: null, user: { suspendedAt: null } },
          select: { userId: true, rating: true }
        }
      },
      take: 300
    })
  ]);

  const excluded = new Set([
    ...library.filter((entry) => entry.status !== ReadingStatus.TO_READ).map((entry) => entry.bookId),
    ...dismissed.map((entry) => entry.bookId)
  ]);
  const positiveBookIds = new Set([
    ...library.filter((entry) => entry.isFavorite || entry.status === ReadingStatus.READ).map((entry) => entry.bookId),
    ...reviews.filter((review) => review.rating >= 4).map((review) => review.bookId)
  ]);
  const preferredAuthors = new Set(
    library.filter((entry) => positiveBookIds.has(entry.bookId)).flatMap((entry) => entry.book.authors.map((author) => author.toLocaleLowerCase("fr")))
  );
  const similarUserWeights = new Map<string, number>();
  for (const book of books) {
    if (!positiveBookIds.has(book.id)) continue;
    for (const review of book.reviews) {
      if (review.userId !== userId && review.rating >= 4) similarUserWeights.set(review.userId, (similarUserWeights.get(review.userId) ?? 0) + 2);
    }
    for (const entry of book.libraries) {
      if (entry.userId !== userId && (entry.isFavorite || entry.status === ReadingStatus.READ)) {
        similarUserWeights.set(entry.userId, (similarUserWeights.get(entry.userId) ?? 0) + 1);
      }
    }
  }

  return books
    .filter((book) => !excluded.has(book.id))
    .map((book) => {
      const authorMatch = book.authors.some((author) => preferredAuthors.has(author.toLocaleLowerCase("fr")));
      const communityScore = book.reviews.reduce((sum, review) => sum + Math.max(0, review.rating - 2), 0)
        + book.libraries.filter((entry) => entry.status === ReadingStatus.READ || entry.isFavorite).length;
      const similarScore = book.reviews.reduce((sum, review) => sum + (review.rating >= 4 ? similarUserWeights.get(review.userId) ?? 0 : 0), 0)
        + book.libraries.reduce((sum, entry) => sum + (entry.status === ReadingStatus.READ || entry.isFavorite ? similarUserWeights.get(entry.userId) ?? 0 : 0), 0);
      const score = communityScore + similarScore * 3 + (authorMatch ? 10 : 0);
      const reason = authorMatch
        ? "Un auteur que tu apprécies"
        : similarScore > 0
          ? "Aimé par des lecteurs aux goûts proches"
          : "Apprécié par la communauté";
      return {
        book: {
          id: book.id,
          title: book.title,
          authors: book.authors,
          thumbnailUrl: book.thumbnailUrl,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount
        },
        score,
        reason
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit);
}
