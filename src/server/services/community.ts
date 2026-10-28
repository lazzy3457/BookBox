import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";

export type ReaderCard = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bookCount: number;
  commonCount: number;
  currentBook: { id: string; title: string; thumbnailUrl: string | null } | null;
  genres: string[];
  isFollowing: boolean;
  lastActiveAt: string | null;
  joinedAt: string;
  readsSameAsViewer: boolean;
};

// Cartes « lecteur » de la Communauté : livres en commun, lecture du moment et genres favoris.
export async function getReaderCards(viewerId: string | null, userIds: string[], followingIds: Set<string>): Promise<ReaderCard[]> {
  if (!userIds.length) return [];

  const [users, viewerBooks] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds }, suspendedAt: null },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        createdAt: true,
        library: {
          orderBy: { updatedAt: "desc" },
          select: { bookId: true, status: true, updatedAt: true, book: { select: { id: true, title: true, thumbnailUrl: true, genres: true } } }
        }
      }
    }),
    viewerId ? prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true, status: true } }) : Promise.resolve([])
  ]);

  const viewerBookIds = new Set(viewerBooks.map((entry) => entry.bookId));
  const viewerReading = new Set(viewerBooks.filter((entry) => entry.status === ReadingStatus.READING).map((entry) => entry.bookId));

  const cards = users.map((user) => {
    const reading = user.library.find((entry) => entry.status === ReadingStatus.READING);
    const genreTally = new Map<string, number>();
    user.library.forEach((entry) => entry.book.genres.forEach((genre) => genreTally.set(genre, (genreTally.get(genre) ?? 0) + 1)));
    return {
      id: user.id,
      name: user.name ?? user.username ?? "Lecteur",
      username: user.username,
      image: user.image,
      bookCount: user.library.length,
      commonCount: user.library.filter((entry) => viewerBookIds.has(entry.bookId)).length,
      currentBook: reading ? { id: reading.book.id, title: reading.book.title, thumbnailUrl: reading.book.thumbnailUrl } : null,
      genres: [...genreTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre),
      isFollowing: followingIds.has(user.id),
      lastActiveAt: user.library[0]?.updatedAt.toISOString() ?? null,
      joinedAt: user.createdAt.toISOString(),
      readsSameAsViewer: user.library.some((entry) => entry.status === ReadingStatus.READING && viewerReading.has(entry.bookId))
    };
  });

  const order = new Map(userIds.map((id, index) => [id, index]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

// Suggestions : lecteurs non suivis, classés par livres en commun puis par ancienneté inverse.
export async function getSuggestedReaderIds(viewerId: string, followingIds: Set<string>, limit = 24) {
  const blocked = await getBlockedUserIds(viewerId);
  const excluded = [viewerId, ...followingIds, ...blocked];
  const myBooks = await prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true } });

  const common = myBooks.length
    ? await prisma.userBook.groupBy({
        by: ["userId"],
        where: { bookId: { in: myBooks.map((entry) => entry.bookId) }, userId: { notIn: excluded }, user: { suspendedAt: null } },
        _count: { bookId: true },
        orderBy: { _count: { bookId: "desc" } },
        take: limit
      })
    : [];

  const ids = common.map((row) => row.userId);
  if (ids.length < limit) {
    const recent = await prisma.user.findMany({
      where: { id: { notIn: [...excluded, ...ids] }, suspendedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit - ids.length,
      select: { id: true }
    });
    ids.push(...recent.map((user) => user.id));
  }
  return ids;
}
