import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";

export async function getFriendActivity(userId: string) {
  const blockedUserIds = await getBlockedUserIds(userId);
  const follows = await prisma.follow.findMany({
    where: { followerId: userId, followingId: { notIn: blockedUserIds } },
    select: { followingId: true }
  });

  const followingIds = follows.map((follow) => follow.followingId);

  if (followingIds.length === 0) {
    return [];
  }

  const [reviews, libraryUpdates] = await Promise.all([
    prisma.review.findMany({
      where: { userId: { in: followingIds }, hiddenAt: null, user: { suspendedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { book: true, user: true, reactions: true, comments: { where: { hiddenAt: null, user: { suspendedAt: null } } } }
    }),
    prisma.userBook.findMany({
      where: { userId: { in: followingIds }, user: { suspendedAt: null } },
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

export async function getTopReviewsLast24Hours(userId?: string) {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const blockedUserIds = userId ? await getBlockedUserIds(userId) : [];

  const reviews = await prisma.review.findMany({
    where: {
      createdAt: { gte: since },
      ...(blockedUserIds.length ? { userId: { notIn: blockedUserIds } } : {})
      ,
      hiddenAt: null,
      user: { suspendedAt: null }
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { book: true, user: true, reactions: true, comments: { where: { hiddenAt: null, user: { suspendedAt: null } } } }
  });

  return reviews
    .map((review) => ({
      ...review,
      score: review.reactions.length * 2 + review.comments.length + review.rating
    }))
    .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);
}
