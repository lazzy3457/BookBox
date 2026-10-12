import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { notifyCommentReaction } from "@/server/services/notifications";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";

export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "comment-reaction", identifier: userId, limit: 60, windowMs: 60_000 });
    const { commentId } = await params;
    const targetComment = await prisma.reviewComment.findFirst({ where: { id: commentId, hiddenAt: null, user: { suspendedAt: null } }, select: { userId: true } });
    if (!targetComment) {
      throw Object.assign(new Error("Commentaire introuvable."), { status: 404, code: "COMMENT_NOT_FOUND" });
    }
    await assertUsersCanInteract(userId, targetComment.userId);

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

    await notifyCommentReaction({ actorId: userId, commentId });

    return NextResponse.json({ liked: true, reaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
