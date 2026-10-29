import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { pollVoteSchema } from "@/server/validation/groups";
import { groupForbidden, requireThreadMember } from "@/server/services/groups";

// Un vote par lecteur ; voter à nouveau change de réponse tant que le sondage est ouvert.
export async function POST(request: Request, { params }: { params: Promise<{ pollId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "poll-vote", identifier: userId, limit: 30, windowMs: 60_000 });
    const { pollId } = await params;
    const { optionId } = pollVoteSchema.parse(await request.json());
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { threadId: true, closesAt: true, options: { select: { id: true } } } });
    if (!poll || !poll.options.some((option) => option.id === optionId)) throw notFound("Sondage introuvable.", "POLL_NOT_FOUND");
    if (poll.closesAt && poll.closesAt < new Date()) throw groupForbidden("Ce sondage est terminé.", "POLL_CLOSED");
    await requireThreadMember(poll.threadId, userId);
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { optionId },
      create: { pollId, optionId, userId }
    });
    return NextResponse.json({ optionId }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
