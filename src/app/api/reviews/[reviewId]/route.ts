import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { reviewMutationSchema } from "@/server/validation/reviews";

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { reviewId } = await params;
    const input = reviewMutationSchema.omit({ bookId: true }).parse(await request.json());

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!existing) {
      throw notFound("Review introuvable.", "REVIEW_NOT_FOUND");
    }

    if (existing.userId !== userId) {
      throw Object.assign(new Error("Tu ne peux modifier que ta propre review."), { status: 403, code: "FORBIDDEN" });
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: input,
      include: { user: true, book: true, reactions: true, comments: { include: { user: true, likes: true } } }
    });

    return NextResponse.json(review);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId();
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
