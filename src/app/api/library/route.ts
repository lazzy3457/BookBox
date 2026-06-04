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

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      throw Object.assign(new Error("bookId est obligatoire."), { status: 400, code: "BOOK_ID_REQUIRED" });
    }

    await prisma.userBook.delete({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
