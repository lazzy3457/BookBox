import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { getProgressSummary, startJourney } from "@/server/services/progression";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await startJourney(userId);
    return NextResponse.json({ progress: await getProgressSummary(userId) });
  } catch (error) {
    return apiError(error);
  }
}
