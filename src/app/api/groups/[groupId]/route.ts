import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { groupUpdateSchema } from "@/server/validation/groups";
import { groupForbidden, requireGroupMember } from "@/server/services/groups";

// Réglages du groupe (règles, lecture commune, défi) : réservés aux modérateurs.
export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { groupId } = await params;
    const access = await requireGroupMember(groupId, userId);
    if (!access.isModerator) throw groupForbidden("Seuls les modérateurs peuvent modifier le groupe.");
    const input = groupUpdateSchema.parse(await request.json());
    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        description: input.description,
        rules: input.rules,
        readalongBookId: input.readalongBookId ?? null,
        readalongLabel: input.readalongLabel,
        challengeGoal: input.challengeGoal ?? null,
        challengeEndsAt: input.challengeEndsAt ? new Date(`${input.challengeEndsAt}T23:59:59.000Z`) : null
      },
      select: { id: true }
    });
    return NextResponse.json({ group });
  } catch (error) {
    return apiError(error);
  }
}
