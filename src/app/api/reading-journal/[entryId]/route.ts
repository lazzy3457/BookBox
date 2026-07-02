import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { readingEntryUpdateSchema } from "@/server/validation/library";

function asDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { entryId } = await params;
    const input = readingEntryUpdateSchema.parse(await request.json());
    const existing = await prisma.readingEntry.findFirst({
      where: { id: entryId, period: { userBook: { userId } } },
      include: { period: { include: { userBook: { include: { book: { select: { pageCount: true } } } } } } }
    });
    if (!existing) throw notFound("Entrée de journal introuvable.");
    const percentage = input.percentage ?? (
      input.page && existing.period.userBook.book.pageCount
        ? Math.min(100, Math.round((input.page / existing.period.userBook.book.pageCount) * 100))
        : null
    );
    const entry = await prisma.readingEntry.update({
      where: { id: existing.id },
      data: {
        entryDate: asDate(input.entryDate),
        page: input.page,
        percentage,
        chapter: input.chapter || null,
        note: input.note || null,
        isPublic: input.isPublic
      }
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { entryId } = await params;
    const entry = await prisma.readingEntry.findFirst({
      where: { id: entryId, period: { userBook: { userId } } }
    });
    if (!entry) throw notFound("Entrée de journal introuvable.");
    await prisma.readingEntry.delete({ where: { id: entry.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
