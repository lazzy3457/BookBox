import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { notifyReviewReaction } from "@/server/services/notifications";
import { reactionMutationSchema } from "@/server/validation/reviews";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "review-reaction", identifier: userId, limit: 60, windowMs: 60_000 });
    const { reviewId } = await params;
    const input = reactionMutationSchema.parse(await request.json());
    const targetReview = await prisma.review.findFirst({ where: { id: reviewId, hiddenAt: null, user: { suspendedAt: null } }, select: { userId: true } });
    if (!targetReview) {
      throw Object.assign(new Error("Review introuvable."), { status: 404, code: "REVIEW_NOT_FOUND" });
    }
    await assertUsersCanInteract(userId, targetReview.userId);
    const existing = await prisma.reviewReaction.findUnique({
      where: {
        reviewId_userId_kind: {
          reviewId,
          userId,
          kind: input.kind
        }
      }
    });

    if (existing) {
      await prisma.reviewReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    const reaction = await prisma.reviewReaction.create({
      data: {
        reviewId,
        userId,
        kind: input.kind
      }
    });

    await notifyReviewReaction({ actorId: userId, reviewId });

    return NextResponse.json({ liked: true, reaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
