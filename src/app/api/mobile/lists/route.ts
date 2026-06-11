import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { listMutationSchema } from "@/server/validation/lists";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const lists = await prisma.bookList.findMany({
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
    });

    return NextResponse.json({ lists });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = listMutationSchema.parse(await request.json());
    const list = await prisma.bookList.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        rating: input.rating,
        isPublic: input.isPublic
      },
      include: {
        entries: true,
        _count: { select: { entries: true } }
      }
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
