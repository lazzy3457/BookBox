import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";

const reorderSchema = z.object({
  orderedBookIds: z.array(z.string().min(1)).min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { listId } = await params;
    const { orderedBookIds } = reorderSchema.parse(await request.json());
    const list = await prisma.bookList.findUnique({
      where: { id: listId },
      include: { entries: { select: { bookId: true } } }
    });

    if (!list || list.userId !== userId) {
      throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
    }

    const entryBookIds = new Set(list.entries.map((entry) => entry.bookId));
    const orderedIds = orderedBookIds.filter((bookId) => entryBookIds.has(bookId));

    await prisma.$transaction(
      orderedIds.map((bookId, index) =>
        prisma.bookListEntry.update({
          where: { listId_bookId: { listId, bookId } },
          data: { order: index + 1 }
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
