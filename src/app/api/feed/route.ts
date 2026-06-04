import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { getFriendActivity } from "@/server/services/feed";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const items = await getFriendActivity(userId);

    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}
