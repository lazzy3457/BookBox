import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";

const listBookMutationSchema = z.object({
  bookId: z.string().min(1),
  note: z.string().trim().max(1000).optional()
});

async function requireOwnedList(listId: string, userId: string) {
  const list = await prisma.bookList.findUnique({ where: { id: listId } });

  if (!list || list.userId !== userId) {
    throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
  }

  return list;
}

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { listId } = await params;
    const input = listBookMutationSchema.parse(await request.json());
    await requireOwnedList(listId, userId);

    const lastEntry = await prisma.bookListEntry.findFirst({
      where: { listId },
      orderBy: { order: "desc" }
    });

    const entry = await prisma.bookListEntry.create({
      data: {
        listId,
        bookId: input.bookId,
        note: input.note,
        order: (lastEntry?.order ?? 0) + 1
      },
      include: { book: true }
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { listId } = await params;
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      throw Object.assign(new Error("bookId est obligatoire."), { status: 400, code: "BOOK_ID_REQUIRED" });
    }

    await requireOwnedList(listId, userId);
    await prisma.bookListEntry.delete({
      where: { listId_bookId: { listId, bookId } }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
