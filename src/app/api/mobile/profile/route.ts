import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";

const profileMutationSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  image: z.string().trim().url().refine((value) => value.startsWith("https://"), "L’avatar doit être une URL https://.").optional().or(z.literal(""))
});

function selectProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          library: true,
          reviews: true,
          followers: true,
          following: true,
          lists: true
        }
      }
    }
  });
}

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const [user, recentBooks, recentReviews, favorites, lists] = await Promise.all([
      selectProfile(userId),
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
        include: { book: true, reactions: true, comments: true }
      }),
      prisma.userBook.findMany({
        where: { userId, isFavorite: true },
        orderBy: { updatedAt: "desc" },
        include: { book: true }
      }),
      prisma.bookList.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
          entries: {
            orderBy: { order: "asc" },
            take: 5,
            include: { book: { select: { id: true, title: true, thumbnailUrl: true } } }
          },
          _count: { select: { entries: true } }
        }
      })
    ]);

    return NextResponse.json({ user, recentBooks, recentReviews, favorites, lists });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = profileMutationSchema.parse(await request.json());

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        bio: input.bio,
        image: input.image || null
      }
    });

    const user = await selectProfile(userId);

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
