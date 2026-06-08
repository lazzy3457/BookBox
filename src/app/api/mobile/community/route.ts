import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getTrendingBooks } from "@/server/services/trending";
import { apiError } from "@/server/http/errors";

export async function GET(request: Request) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const [readers, recentReviews, trendingBooks, following] = await Promise.all([
      prisma.user.findMany({
        where: currentUserId ? { id: { not: currentUserId } } : {},
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          _count: {
            select: {
              library: true,
              reviews: true,
              followers: true
            }
          }
        }
      }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: true,
          book: true,
          reactions: true,
          comments: true
        }
      }),
      getTrendingBooks(),
      currentUserId
        ? prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
          })
        : Promise.resolve([])
    ]);
    const followingIds = new Set(following.map((follow) => follow.followingId));

    return NextResponse.json({
      readers: readers.map((reader) => ({
        id: reader.id,
        name: reader.name,
        username: reader.username,
        email: reader.email,
        image: reader.image,
        isFollowing: followingIds.has(reader.id),
        counts: {
          library: reader._count.library,
          reviews: reader._count.reviews,
          followers: reader._count.followers
        }
      })),
      recentReviews,
      trendingBooks
    });
  } catch (error) {
    return apiError(error);
  }
}
