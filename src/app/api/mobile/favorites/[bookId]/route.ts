import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";

export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { bookId } = await params;
    const entry = await prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } }
    });

    if (!entry) {
      throw notFound("Livre non present dans ta bibliotheque.", "LIBRARY_ENTRY_NOT_FOUND");
    }

    const item = await prisma.userBook.update({
      where: { userId_bookId: { userId, bookId } },
      data: { isFavorite: !entry.isFavorite },
      include: { book: true }
    });

    return NextResponse.json(item);
  } catch (error) {
    return apiError(error);
  }
}
