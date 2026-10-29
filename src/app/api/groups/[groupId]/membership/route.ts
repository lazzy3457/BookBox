import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { getGroupAccess, groupForbidden } from "@/server/services/groups";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-membership", identifier: userId, limit: 30, windowMs: 60_000 });
    const { groupId } = await params;
    const access = await getGroupAccess({ id: groupId }, userId);
    if (!access || !access.canView) throw notFound("Groupe introuvable.", "GROUP_NOT_FOUND");
    if (access.group.visibility === "INVITE" && !access.invited && !access.isMember) {
      throw groupForbidden("Ce groupe est sur invitation.", "GROUP_INVITE_REQUIRED");
    }
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId }
    });
    await prisma.groupInvite.deleteMany({ where: { groupId, userId } });
    return NextResponse.json({ member: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

// Quitter le groupe ; si le dernier modérateur part, le membre le plus ancien prend le relais.
export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { groupId } = await params;
    await prisma.$transaction(async (transaction) => {
      await transaction.groupMember.deleteMany({ where: { groupId, userId } });
      const moderators = await transaction.groupMember.count({ where: { groupId, role: "MODERATOR" } });
      if (!moderators) {
        const oldest = await transaction.groupMember.findFirst({ where: { groupId }, orderBy: { joinedAt: "asc" }, select: { id: true } });
        if (oldest) await transaction.groupMember.update({ where: { id: oldest.id }, data: { role: "MODERATOR" } });
      }
    });
    return NextResponse.json({ member: false });
  } catch (error) {
    return apiError(error);
  }
}
