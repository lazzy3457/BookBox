import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type TrendPeriod = "week" | "month" | "year";

export const periodDays: Record<TrendPeriod, number> = { week: 7, month: 30, year: 365 };

// Barème affiché dans « Comment on calcule ? ».
export const TREND_POINTS = { review: 4, finished: 3, added: 2, reaction: 1 } as const;

type Tally = { score: number; reviews: number; finished: number; added: number; reading: number; reactions: number };

const emptyTally = (): Tally => ({ score: 0, reviews: 0, finished: 0, added: 0, reading: 0, reactions: 0 });

export type RankedBook = {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  genres: string[];
  rank: number;
  // Places gagnées (positif) ou perdues depuis la période précédente ; null = nouvelle entrée.
  movement: number | null;
  tally: Tally;
  averageRating: number | null;
  ratingCount: number;
};

async function tallies(since: Date, until: Date) {
  const [entries, reviews] = await Promise.all([
    prisma.userBook.findMany({
      where: { updatedAt: { gte: since, lt: until }, user: { suspendedAt: null } },
      select: { bookId: true, status: true }
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: since, lt: until }, hiddenAt: null, user: { suspendedAt: null } },
      select: { bookId: true, _count: { select: { reactions: true } } }
    })
  ]);

  const map = new Map<string, Tally>();
  const get = (bookId: string) => {
    const tally = map.get(bookId) ?? emptyTally();
    map.set(bookId, tally);
    return tally;
  };

  entries.forEach((entry) => {
    const tally = get(entry.bookId);
    if (entry.status === ReadingStatus.READ) {
      tally.finished += 1;
      tally.score += TREND_POINTS.finished;
    } else if (entry.status === ReadingStatus.READING || entry.status === ReadingStatus.TO_READ) {
      tally.added += 1;
      if (entry.status === ReadingStatus.READING) tally.reading += 1;
      tally.score += TREND_POINTS.added;
    }
  });
  reviews.forEach((review) => {
    const tally = get(review.bookId);
    tally.reviews += 1;
    tally.reactions += review._count.reactions;
    tally.score += TREND_POINTS.review + review._count.reactions * TREND_POINTS.reaction;
  });

  return map;
}

function rankIds(map: Map<string, Tally>, allowed?: Set<string>) {
  return [...map.entries()]
    .filter(([bookId, tally]) => tally.score > 0 && (!allowed || allowed.has(bookId)))
    .sort((a, b) => b[1].score - a[1].score)
    .map(([bookId]) => bookId);
}

export async function getTrendingRanking({ period = "week", genre, limit = 20 }: { period?: TrendPeriod; genre?: string | null; limit?: number } = {}) {
  const now = new Date();
  const days = periodDays[period];
  const start = new Date(now.getTime() - days * 86400000);
  const previousStart = new Date(start.getTime() - days * 86400000);

  try {
    const [current, previous] = await Promise.all([tallies(start, now), tallies(previousStart, start)]);
    const candidateIds = [...new Set([...current.keys(), ...previous.keys()])];
    if (!candidateIds.length) return { books: [] as RankedBook[], risers: [] as RankedBook[] };

    const books = await prisma.book.findMany({
      where: { id: { in: candidateIds }, ...(genre ? { genres: { has: genre } } : {}) },
      select: { id: true, title: true, authors: true, thumbnailUrl: true, genres: true }
    });
    const allowed = new Set(books.map((book) => book.id));
    const currentOrder = rankIds(current, allowed);
    const previousOrder = rankIds(previous, allowed);
    const previousRank = new Map(previousOrder.map((id, index) => [id, index + 1]));

    const topIds = currentOrder.slice(0, Math.max(limit, 20));
    const ratings = await prisma.review.groupBy({
      by: ["bookId"],
      where: { bookId: { in: topIds }, hiddenAt: null, user: { suspendedAt: null } },
      _avg: { rating: true },
      _count: { rating: true }
    });
    const ratingMap = new Map(ratings.map((row) => [row.bookId, row]));
    const bookMap = new Map(books.map((book) => [book.id, book]));

    const ranked: RankedBook[] = topIds.map((id, index) => {
      const book = bookMap.get(id)!;
      const before = previousRank.get(id);
      return {
        ...book,
        rank: index + 1,
        movement: before ? before - (index + 1) : null,
        tally: current.get(id) ?? emptyTally(),
        averageRating: ratingMap.get(id)?._avg.rating ?? null,
        ratingCount: ratingMap.get(id)?._count.rating ?? 0
      };
    });

    const risers = ranked
      .filter((book) => (book.movement ?? 0) > 0)
      .sort((a, b) => (b.movement ?? 0) - (a.movement ?? 0))
      .slice(0, 3);

    return { books: ranked.slice(0, limit), risers };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Classement indisponible tant que la base n'est pas joignable.", error);
      return { books: [] as RankedBook[], risers: [] as RankedBook[] };
    }
    throw error;
  }
}

// Phrase « Pourquoi ce livre ? » à partir des signaux de la période.
export function trendReason(book: RankedBook) {
  const parts: string[] = [];
  if (book.tally.added) parts.push(`${book.tally.added} lecteur${book.tally.added > 1 ? "s" : ""} l'${book.tally.added > 1 ? "ont" : "a"} ajouté`);
  if (book.tally.finished) parts.push(`${book.tally.finished} l'${book.tally.finished > 1 ? "ont" : "a"} terminé`);
  if (book.tally.reviews) parts.push(`${book.tally.reviews} review${book.tally.reviews > 1 ? "s" : ""}`);
  if (book.averageRating) parts.push(`note moyenne ${book.averageRating.toFixed(1).replace(".", ",")}`);
  return parts.join(", ") || "Il commence à circuler dans la communauté";
}
