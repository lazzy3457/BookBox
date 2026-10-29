import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { groupPostCreateSchema } from "@/server/validation/groups";
import { requireThreadMember } from "@/server/services/groups";
import { notifyGroupPost } from "@/server/services/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-post", identifier: userId, limit: 30, windowMs: 60_000 });
    const { threadId } = await params;
    await requireThreadMember(threadId, userId);
    const input = groupPostCreateSchema.parse(await request.json());
    if (input.parentId) {
      const parent = await prisma.groupPost.findFirst({ where: { id: input.parentId, threadId, deletedAt: null }, select: { id: true, parentId: true } });
      if (!parent) throw notFound("Message introuvable.", "GROUP_POST_NOT_FOUND");
      // Un seul niveau de réponse : on se rattache au message racine.
      input.parentId = parent.parentId ?? parent.id;
    }
    const now = new Date();
    const [post] = await prisma.$transaction([
      prisma.groupPost.create({
        data: { threadId, authorId: userId, parentId: input.parentId ?? null, body: input.body },
        select: { id: true, body: true, parentId: true, createdAt: true }
      }),
      prisma.groupThread.update({ where: { id: threadId }, data: { lastPostAt: now } })
    ]);
    await notifyGroupPost({ actorId: userId, postId: post.id }).catch(() => console.warn("[groups] Notification de réponse non envoyée."));
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
