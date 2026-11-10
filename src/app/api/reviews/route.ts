import { publicUserSelect } from "@/server/db/selects";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, conflict } from "@/server/http/errors";
import { notifyFriendReview } from "@/server/services/notifications";
import { recordProgress } from "@/server/services/progression";
import { reviewMutationSchema } from "@/server/validation/reviews";
import { advanceChapterProgress } from "@/server/services/chapters";
import { WHOLE_BOOK } from "@/lib/chapters";
import { enforceRateLimit } from "@/server/security/rateLimit";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "review-create", identifier: userId, limit: 60, windowMs: 60 * 60_000 });
    const input = reviewMutationSchema.parse(await request.json());
    const isChapterReview = input.chapter > WHOLE_BOOK;
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_bookId_chapter: { userId, bookId: input.bookId, chapter: input.chapter }
      }
    });

    if (existingReview) {
      throw conflict(
        isChapterReview
          ? "Tu as déjà publié un avis sur ce chapitre. Tu peux modifier ton avis existant."
          : "Tu as deja publie une review pour ce livre. Tu peux modifier ta review existante.",
        "REVIEW_ALREADY_EXISTS"
      );
    }

    const review = await prisma.review.create({
      data: {
        userId,
        bookId: input.bookId,
        chapter: input.chapter,
        rating: input.rating,
        body: input.body,
        // Un avis de chapitre dévoile forcément l'intrigue : il reste marqué spoiler partout.
        spoiler: isChapterReview || input.spoiler
      },
      include: { book: true, user: { select: publicUserSelect } }
    });

    if (isChapterReview) {
      // Ni notification aux amis ni XP : l'avis de chapitre ne vit que dans l'espace chapitres.
      await advanceChapterProgress(userId, review.bookId, review.chapter);
    } else {
      await notifyFriendReview({ actorId: userId, reviewId: review.id });
      // Source = livre : supprimer puis réécrire une review ne redonne pas d'XP.
      await recordProgress(userId, "REVIEW", review.bookId);
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
