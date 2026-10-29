import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { requireGroupMember } from "@/server/services/groups";

const bellSchema = z.object({ notifyAll: z.boolean() });

// La cloche du groupe : être prévenu aussi des nouvelles discussions.
export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { groupId } = await params;
    await requireGroupMember(groupId, userId);
    const { notifyAll } = bellSchema.parse(await request.json());
    await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { notifyAll } });
    return NextResponse.json({ notifyAll });
  } catch (error) {
    return apiError(error);
  }
}
