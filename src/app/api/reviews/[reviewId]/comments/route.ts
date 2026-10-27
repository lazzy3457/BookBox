import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { notifyReviewComment } from "@/server/services/notifications";
import { recordProgress } from "@/server/services/progression";
import { commentMutationSchema } from "@/server/validation/reviews";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "comment-create", identifier: userId, limit: 20, windowMs: 60_000 });
    const { reviewId } = await params;
    const input = commentMutationSchema.parse(await request.json());
    const review = await prisma.review.findFirst({ where: { id: reviewId, hiddenAt: null, user: { suspendedAt: null } }, select: { userId: true } });
    if (!review) {
      throw Object.assign(new Error("Review introuvable."), { status: 404, code: "REVIEW_NOT_FOUND" });
    }
    await assertUsersCanInteract(userId, review.userId);
    if (input.parentId) {
      // On ne répond qu'à un commentaire visible de la même review.
      const parent = await prisma.reviewComment.findFirst({
        where: { id: input.parentId, reviewId, hiddenAt: null, deletedAt: null, user: { suspendedAt: null } },
        select: { userId: true }
      });
      if (!parent) {
        throw notFound("Commentaire introuvable.", "COMMENT_NOT_FOUND");
      }
      await assertUsersCanInteract(userId, parent.userId);
    }
    const comment = await prisma.reviewComment.create({
      data: {
        reviewId,
        userId,
        body: input.body,
        parentId: input.parentId
      },
      include: { user: true }
    });

    await notifyReviewComment({ actorId: userId, commentId: comment.id });
    await recordProgress(userId, "COMMENT", comment.id);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
