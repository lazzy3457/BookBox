import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { commentMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId();
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
