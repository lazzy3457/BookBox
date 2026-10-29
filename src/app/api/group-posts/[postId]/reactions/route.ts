import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { requireThreadMember } from "@/server/services/groups";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-reaction", identifier: userId, limit: 60, windowMs: 60_000 });
    const { postId } = await params;
    const post = await prisma.groupPost.findFirst({ where: { id: postId, deletedAt: null, hiddenAt: null }, select: { threadId: true } });
    if (!post) throw notFound("Message introuvable.", "GROUP_POST_NOT_FOUND");
    await requireThreadMember(post.threadId, userId);
    const existing = await prisma.groupPostReaction.findUnique({ where: { postId_userId: { postId, userId } }, select: { id: true } });
    if (existing) {
      await prisma.groupPostReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.groupPostReaction.create({ data: { postId, userId } });
    return NextResponse.json({ liked: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
