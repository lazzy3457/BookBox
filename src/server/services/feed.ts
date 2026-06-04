import { prisma } from "@/server/db/prisma";

export async function getFriendActivity(userId: string) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });

  const followingIds = follows.map((follow) => follow.followingId);

  if (followingIds.length === 0) {
    return [];
  }

  const [reviews, libraryUpdates] = await Promise.all([
    prisma.review.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { book: true, user: true, reactions: true, comments: true }
    }),
    prisma.userBook.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { book: true, user: true }
    })
  ]);

  return [
    ...reviews.map((review) => ({
      id: `review-${review.id}`,
      type: "review" as const,
      createdAt: review.createdAt,
      review
    })),
    ...libraryUpdates.map((entry) => ({
      id: `library-${entry.id}`,
      type: "library" as const,
      createdAt: entry.updatedAt,
      entry
    }))
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);
}
