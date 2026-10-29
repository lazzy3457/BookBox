import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { groupThreadCreateSchema } from "@/server/validation/groups";
import { groupForbidden, requireGroupMember } from "@/server/services/groups";
import { notifyGroupThread } from "@/server/services/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-thread", identifier: userId, limit: 10, windowMs: 60 * 60_000 });
    const { groupId } = await params;
    const access = await requireGroupMember(groupId, userId);
    const input = groupThreadCreateSchema.parse(await request.json());
    if (input.type === "ANNOUNCEMENT" && !access.isModerator) throw groupForbidden("Seuls les modérateurs publient des annonces.");

    const options = (input.pollOptions ?? []).map((label) => label.trim()).filter(Boolean);
    const thread = await prisma.groupThread.create({
      data: {
        groupId,
        authorId: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        spoilerLevel: input.spoilerLevel,
        bookId: input.bookId ?? null,
        pinned: input.type === "ANNOUNCEMENT",
        poll:
          input.type === "POLL"
            ? {
                create: {
                  question: input.title,
                  closesAt: input.pollClosesInDays ? new Date(Date.now() + input.pollClosesInDays * 86400000) : null,
                  options: { create: options.map((label, position) => ({ label, position })) }
                }
              }
            : undefined
      },
      select: { id: true }
    });
    await notifyGroupThread({ actorId: userId, threadId: thread.id }).catch(() => console.warn("[groups] Notification de discussion non envoyée."));
    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
