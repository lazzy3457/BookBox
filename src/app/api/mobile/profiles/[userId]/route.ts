import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError, notFound } from "@/server/http/errors";
import { areUsersBlocked } from "@/server/services/blocks";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const { userId } = await params;
    if (currentUserId && await areUsersBlocked(currentUserId, userId)) {
      throw notFound("Utilisateur introuvable.", "USER_NOT_FOUND");
    }
    const [user, libraryCount, reviewCount, followerCount, followingCount, recentBooks, recentReviews, isFollowing] =
      await Promise.all([
        prisma.user.findFirst({
          where: { id: userId, suspendedAt: null },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
            createdAt: true
          }
        }),
        prisma.userBook.count({ where: { userId } }),
        prisma.review.count({ where: { userId } }),
        prisma.follow.count({ where: { followingId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
        prisma.userBook.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 10,
          include: { book: true }
        }),
        prisma.review.findMany({
          where: { userId, hiddenAt: null },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { book: true, reactions: true, comments: { where: { hiddenAt: null, user: { suspendedAt: null } } } }
        }),
        currentUserId
          ? prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: userId
                }
              }
            })
          : Promise.resolve(null)
      ]);

    if (!user) {
      throw notFound("Utilisateur introuvable.", "USER_NOT_FOUND");
    }

    return NextResponse.json({
      user,
      stats: {
        library: libraryCount,
        reviews: reviewCount,
        followers: followerCount,
        following: followingCount
      },
      recentBooks,
      recentReviews,
      isFollowing: Boolean(isFollowing),
      isOwnProfile: currentUserId === userId
    });
  } catch (error) {
    return apiError(error);
  }
}
