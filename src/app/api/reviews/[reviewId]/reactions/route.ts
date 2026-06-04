import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { reactionMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { reviewId } = await params;
    const input = reactionMutationSchema.parse(await request.json());
    const reaction = await prisma.reviewReaction.upsert({
      where: {
        reviewId_userId_kind: {
          reviewId,
          userId,
          kind: input.kind
        }
      },
      update: {},
      create: {
        reviewId,
        userId,
        kind: input.kind
      }
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
