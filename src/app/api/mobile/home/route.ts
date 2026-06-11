import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { getFriendActivity } from "@/server/services/feed";
import { getTrendingBooks } from "@/server/services/trending";
import { apiError } from "@/server/http/errors";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request);
    const [trending, activity] = await Promise.all([
      getTrendingBooks(),
      userId ? getFriendActivity(userId) : Promise.resolve([])
    ]);

    return NextResponse.json({ trending, activity });
  } catch (error) {
    return apiError(error);
  }
}
