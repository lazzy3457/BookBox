import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";

// Aimer une citation : toute citation visible (publique, ou la sienne), comme un avis.
export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "quote-like", identifier: userId, limit: 60, windowMs: 60_000 });
    const { entryId } = await params;
    const entry = await prisma.readingEntry.findFirst({
      where: {
        id: entryId,
        kind: "QUOTE",
        period: { userBook: { user: { suspendedAt: null } } },
        OR: [{ isPublic: true }, { period: { userBook: { userId } } }]
      },
      select: { period: { select: { userBook: { select: { userId: true } } } } }
    });
    if (!entry) throw notFound("Citation introuvable.", "QUOTE_NOT_FOUND");
    const ownerId = entry.period.userBook.userId;
    if (ownerId !== userId) await assertUsersCanInteract(userId, ownerId);

    const existing = await prisma.readingEntryLike.findUnique({ where: { entryId_userId: { entryId, userId } }, select: { id: true } });
    if (existing) {
      await prisma.readingEntryLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.readingEntryLike.create({ data: { entryId, userId } });
    return NextResponse.json({ liked: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
