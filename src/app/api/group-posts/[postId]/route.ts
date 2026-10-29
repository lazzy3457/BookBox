import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { getGroupAccess, groupForbidden } from "@/server/services/groups";

// Suppression douce : le message disparaît mais ses réponses restent dans le fil.
export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { postId } = await params;
    const post = await prisma.groupPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true, thread: { select: { groupId: true } } }
    });
    if (!post) throw notFound("Message introuvable.", "GROUP_POST_NOT_FOUND");
    const access = await getGroupAccess({ id: post.thread.groupId }, userId);
    if (post.authorId !== userId && !access?.isModerator) throw groupForbidden("Tu ne peux supprimer que tes propres messages.");
    await prisma.groupPost.update({ where: { id: postId }, data: { deletedAt: new Date(), body: "" } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
