import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";

export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { commentId } = await params;

    const existing = await prisma.reviewCommentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    if (existing) {
      await prisma.reviewCommentReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    const reaction = await prisma.reviewCommentReaction.create({
      data: {
        commentId,
        userId
      }
    });

    return NextResponse.json({ liked: true, reaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
