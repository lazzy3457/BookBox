import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, conflict, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";
import { groupInviteSchema } from "@/server/validation/groups";
import { requireGroupMember } from "@/server/services/groups";
import { notifyGroupInvite } from "@/server/services/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-invite", identifier: userId, limit: 30, windowMs: 60 * 60_000 });
    const { groupId } = await params;
    await requireGroupMember(groupId, userId);
    const { username } = groupInviteSchema.parse(await request.json());
    const invitee = await prisma.user.findFirst({
      where: { username: username.replace(/^@/, "").toLowerCase(), suspendedAt: null },
      select: { id: true }
    });
    if (!invitee) throw notFound("Aucun lecteur avec ce pseudo.", "USER_NOT_FOUND");
    await assertUsersCanInteract(userId, invitee.id);
    if (await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: invitee.id } }, select: { id: true } })) {
      throw conflict("Ce lecteur fait déjà partie du groupe.", "ALREADY_MEMBER");
    }
    await prisma.groupInvite.upsert({
      where: { groupId_userId: { groupId, userId: invitee.id } },
      update: {},
      create: { groupId, userId: invitee.id, invitedById: userId }
    });
    await notifyGroupInvite({ actorId: userId, groupId, recipientId: invitee.id }).catch(() => console.warn("[groups] Notification d'invitation non envoyée."));
    return NextResponse.json({ invited: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
