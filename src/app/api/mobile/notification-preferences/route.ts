import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { getOrCreateNotificationPreferences, updateNotificationPreferences } from "@/server/services/notifications";
import { notificationPreferenceSchema } from "@/server/validation/notifications";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const preferences = await getOrCreateNotificationPreferences(userId);

    return NextResponse.json({ preferences });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = notificationPreferenceSchema.parse(await request.json());
    const preferences = await updateNotificationPreferences(userId, input);

    return NextResponse.json({ preferences });
  } catch (error) {
    return apiError(error);
  }
}
