import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { readingEntrySchema, readingPeriodSchema, readingPeriodUpdateSchema } from "@/server/validation/library";

function asDate(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const bookId = new URL(request.url).searchParams.get("bookId");
    const periods = await prisma.readingPeriod.findMany({
      where: { userBook: { userId, ...(bookId ? { bookId } : {}) } },
      include: { entries: { orderBy: { entryDate: "desc" } }, userBook: { include: { book: true } } },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }]
    });
    return NextResponse.json({ periods });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const payload = await request.json();

    if (payload.type === "period") {
      const input = readingPeriodSchema.parse(payload);
      const userBook = await prisma.userBook.findUnique({
        where: { userId_bookId: { userId, bookId: input.bookId } }
      });
      if (!userBook) throw notFound("Ce livre n'est pas dans ta bibliothèque.");
      const period = await prisma.readingPeriod.create({
        data: {
          userBookId: userBook.id,
          startedAt: asDate(input.startedAt),
          finishedAt: asDate(input.finishedAt),
          isReread: input.isReread
        },
        include: { entries: true }
      });
      return NextResponse.json({ period }, { status: 201 });
    }

    const input = readingEntrySchema.parse(payload);
    const period = await prisma.readingPeriod.findFirst({
      where: { id: input.periodId, userBook: { userId } },
      include: { userBook: { include: { book: { select: { pageCount: true } } } } }
    });
    if (!period) throw notFound("Période de lecture introuvable.");
    const computedPercentage = input.percentage ?? (
      input.page && period.userBook.book.pageCount
        ? Math.min(100, Math.round((input.page / period.userBook.book.pageCount) * 100))
        : null
    );
    const entry = await prisma.readingEntry.create({
      data: {
        periodId: period.id,
        entryDate: asDate(input.entryDate) ?? new Date(),
        page: input.page,
        percentage: computedPercentage,
        chapter: input.chapter || null,
        note: input.note || null,
        isPublic: input.isPublic
      }
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = readingPeriodUpdateSchema.parse(await request.json());
    const existing = await prisma.readingPeriod.findFirst({ where: { id: input.periodId, userBook: { userId } } });
    if (!existing) throw notFound("Période de lecture introuvable.");
    const period = await prisma.readingPeriod.update({
      where: { id: existing.id },
      data: {
        ...(input.startedAt !== undefined ? { startedAt: asDate(input.startedAt) } : {}),
        ...(input.finishedAt !== undefined ? { finishedAt: asDate(input.finishedAt) } : {}),
        ...(input.isReread !== undefined ? { isReread: input.isReread } : {})
      }
    });
    return NextResponse.json({ period });
  } catch (error) {
    return apiError(error);
  }
}
