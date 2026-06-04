import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { libraryMutationSchema } from "@/server/validation/library";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const items = await prisma.userBook.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { book: true }
    });

    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const input = libraryMutationSchema.parse(await request.json());
    const item = await prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: input.bookId
        }
      },
      update: { status: input.status },
      create: {
        userId,
        bookId: input.bookId,
        status: input.status
      },
      include: { book: true }
    });

    return NextResponse.json(item);
  } catch (error) {
    return apiError(error);
  }
}
