import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { notifyReviewReaction } from "@/server/services/notifications";
import { reactionMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { reviewId } = await params;
    const input = reactionMutationSchema.parse(await request.json());
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
