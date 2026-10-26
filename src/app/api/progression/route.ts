import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { getProgressSummary, updateProgressSettings } from "@/server/services/progression";
import { progressSettingsSchema } from "@/server/validation/progression";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    return NextResponse.json({ progress: await getProgressSummary(userId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = progressSettingsSchema.parse(await request.json());
    await updateProgressSettings(userId, input);
    return NextResponse.json({ progress: await getProgressSummary(userId) });
  } catch (error) {
    return apiError(error);
  }
}
