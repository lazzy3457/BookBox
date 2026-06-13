import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { notifyReviewComment } from "@/server/services/notifications";
import { commentMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { reviewId } = await params;
    const input = commentMutationSchema.parse(await request.json());
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
