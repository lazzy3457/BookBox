import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { areUsersBlocked } from "@/server/services/blocks";
import { getEarnedBadges } from "@/server/services/progression";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewerId = await getCurrentUserId(request);
    const { userId } = await params;
    if (viewerId && await areUsersBlocked(viewerId, userId)) throw notFound("Lecteur introuvable.");
    return NextResponse.json({ badges: await getEarnedBadges(userId) });
  } catch (error) {
    return apiError(error);
  }
}
