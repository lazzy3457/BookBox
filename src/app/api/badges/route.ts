import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { BADGES, tierName } from "@/lib/progression";
import { getBadgeOverview } from "@/server/services/progression";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request);
    if (userId) return NextResponse.json({ badges: await getBadgeOverview(userId) });

    const catalog = BADGES.map((badge) => ({
      ...badge,
      tiers: badge.tiers.map((threshold, index) => ({ tier: index + 1, name: tierName(index + 1), threshold }))
    }));
    return NextResponse.json({ badges: catalog });
  } catch (error) {
    return apiError(error);
  }
}
