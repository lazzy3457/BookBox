import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { setChapterProgress } from "@/server/services/chapters";
import { chapterProgressSchema } from "@/server/validation/reviews";

// « J'en suis au chapitre N » : ouvre au lecteur les avis des chapitres 1 à N.
export async function PUT(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { bookId } = await params;
    await enforceRateLimit({ scope: "chapter-progress", identifier: userId, limit: 60, windowMs: 60_000 });
    const input = chapterProgressSchema.parse(await request.json());

    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");

    const progress = await setChapterProgress(userId, bookId, input.chapter);
    return NextResponse.json({ chapter: progress.chapter });
  } catch (error) {
    return apiError(error);
  }
}
