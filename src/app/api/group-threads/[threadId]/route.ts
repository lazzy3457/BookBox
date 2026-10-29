import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { groupThreadUpdateSchema } from "@/server/validation/groups";
import { groupForbidden, requireThreadMember } from "@/server/services/groups";

// Épingler une discussion : réservé aux modérateurs du groupe.
export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { threadId } = await params;
    const { access } = await requireThreadMember(threadId, userId);
    if (!access.isModerator) throw groupForbidden("Seuls les modérateurs peuvent épingler.");
    const { pinned } = groupThreadUpdateSchema.parse(await request.json());
    await prisma.groupThread.update({ where: { id: threadId }, data: { pinned } });
    return NextResponse.json({ pinned });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { threadId } = await params;
    const { thread, access } = await requireThreadMember(threadId, userId);
    if (thread.authorId !== userId && !access.isModerator) throw groupForbidden("Tu ne peux supprimer que tes propres discussions.");
    await prisma.groupThread.delete({ where: { id: threadId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
