import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";

const userSearchSchema = z.object({
  q: z.string().trim().min(2, "Recherche trop courte.").max(120)
});

export async function GET(request: Request) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);
    const { q } = userSearchSchema.parse({ q: searchParams.get("q") ?? "" });

    const readers = await prisma.user.findMany({
      where: {
        ...(currentUserId ? { id: { not: currentUserId } } : {}),
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } }
        ]
      },
      orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
      take: 12,
      include: {
        _count: {
          select: {
            library: true,
            reviews: true,
            followers: true
          }
        }
      }
    });

    const followedIds = currentUserId
      ? new Set(
          (
            await prisma.follow.findMany({
              where: {
                followerId: currentUserId,
                followingId: { in: readers.map((reader) => reader.id) }
              },
              select: { followingId: true }
            })
          ).map((follow) => follow.followingId)
        )
      : new Set<string>();

    return NextResponse.json({
      readers: readers.map((reader) => ({
        id: reader.id,
        name: reader.name,
        username: reader.username,
        email: reader.email,
        isFollowing: followedIds.has(reader.id),
        counts: {
          library: reader._count.library,
          reviews: reader._count.reviews,
          followers: reader._count.followers
        }
      }))
    });
  } catch (error) {
    return apiError(error);
  }
}
