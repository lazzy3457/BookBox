import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { requireThreadMember } from "@/server/services/groups";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-reaction", identifier: userId, limit: 60, windowMs: 60_000 });
    const { threadId } = await params;
    await requireThreadMember(threadId, userId);
    const existing = await prisma.groupThreadReaction.findUnique({ where: { threadId_userId: { threadId, userId } }, select: { id: true } });
    if (existing) {
      await prisma.groupThreadReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.groupThreadReaction.create({ data: { threadId, userId } });
    return NextResponse.json({ liked: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
