import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { areUsersBlocked } from "@/server/services/blocks";
import { getEarnedBadges } from "@/server/services/progression";
import { prisma } from "@/server/db/prisma";
import { levelProgress } from "@/lib/progression";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewerId = await getCurrentUserId(request);
    const { userId } = await params;
    if (viewerId && await areUsersBlocked(viewerId, userId)) throw notFound("Lecteur introuvable.");
    const [badges, stats] = await Promise.all([
      getEarnedBadges(userId),
      prisma.userStats.findUnique({ where: { userId }, select: { xpTotal: true } })
    ]);
    const { level, title } = levelProgress(stats?.xpTotal ?? 0);
    return NextResponse.json({ level, levelTitle: title, badges });
  } catch (error) {
    return apiError(error);
  }
}
