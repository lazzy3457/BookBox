import { publicUserSelect } from "@/server/db/selects";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { reviewMutationSchema } from "@/server/validation/reviews";

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { reviewId } = await params;
    await enforceRateLimit({ scope: "review-edit", identifier: userId, limit: 30, windowMs: 60_000 });
    const input = reviewMutationSchema.omit({ bookId: true }).parse(await request.json());

    const existing = await prisma.review.findFirst({ where: { id: reviewId, hiddenAt: null } });

    if (!existing) {
      throw notFound("Review introuvable.", "REVIEW_NOT_FOUND");
    }

    if (existing.userId !== userId) {
      throw Object.assign(new Error("Tu ne peux modifier que ta propre review."), { status: 403, code: "FORBIDDEN" });
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: input,
      include: { user: { select: publicUserSelect }, book: true, reactions: true, comments: { where: { hiddenAt: null, deletedAt: null }, include: { user: { select: publicUserSelect }, likes: true } } }
    });

    return NextResponse.json(review);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { reviewId } = await params;
    const existing = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!existing) {
      throw notFound("Review introuvable.", "REVIEW_NOT_FOUND");
    }

    if (existing.userId !== userId) {
      throw Object.assign(new Error("Tu ne peux supprimer que ta propre review."), { status: 403, code: "FORBIDDEN" });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
