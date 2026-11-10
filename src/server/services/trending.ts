import { ReadingStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db/prisma";

const TRENDING_LIMIT = 12;

// Le classement se calcule en base sur les 30 derniers jours : on ne charge que les livres retenus,
// et la réponse ne contient ni bibliothèques ni avis des lecteurs.
async function computeTrendingBooks() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [entries, reviews] = await Promise.all([
    prisma.userBook.groupBy({
      by: ["bookId", "status"],
      where: {
        updatedAt: { gte: since },
        status: { in: [ReadingStatus.READ, ReadingStatus.TO_READ] },
        user: { suspendedAt: null }
      },
      _count: { _all: true }
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: since }, hiddenAt: null, user: { suspendedAt: null } },
      select: { bookId: true, _count: { select: { reactions: true } } }
    })
  ]);

  const tallies = new Map<string, { score: number; readers: number }>();
  const tally = (bookId: string) => {
    const value = tallies.get(bookId) ?? { score: 0, readers: 0 };
    tallies.set(bookId, value);
    return value;
  };

  entries.forEach((entry) => {
    const value = tally(entry.bookId);
    value.readers += entry._count._all;
    value.score += entry._count._all * (entry.status === ReadingStatus.READ ? 3 : 2);
  });
  reviews.forEach((review) => {
    tally(review.bookId).score += 4 + review._count.reactions;
  });

  const topIds = [...tallies.entries()]
    .filter(([, value]) => value.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, TRENDING_LIMIT)
    .map(([bookId]) => bookId);
  if (!topIds.length) return [];

  const [books, ratings] = await Promise.all([
    prisma.book.findMany({
      where: { id: { in: topIds } },
      select: {
        id: true,
        title: true,
        authors: true,
        description: true,
        thumbnailUrl: true,
        publishedDate: true,
        publisher: true,
        pageCount: true,
        language: true,
        genres: true
      }
    }),
    prisma.review.groupBy({
      by: ["bookId"],
      where: { bookId: { in: topIds }, hiddenAt: null, user: { suspendedAt: null } },
      _avg: { rating: true }
    })
  ]);
  const bookMap = new Map(books.map((book) => [book.id, book]));
  const ratingMap = new Map(ratings.map((row) => [row.bookId, row._avg.rating]));

  return topIds.flatMap((id) => {
    const book = bookMap.get(id);
    const value = tallies.get(id);
    return book && value ? [{ ...book, score: value.score, readers: value.readers, averageRating: ratingMap.get(id) ?? null }] : [];
  });
}

const cachedTrendingBooks = unstable_cache(computeTrendingBooks, ["trending-books"], { revalidate: 300 });

export async function getTrendingBooks() {
  try {
    return await cachedTrendingBooks();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Trending unavailable until the database is reachable.", error);
      return [];
    }

    throw error;
  }
}
