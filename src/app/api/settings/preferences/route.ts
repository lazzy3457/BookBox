import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { userPreferenceSchema } from "@/server/validation/settings";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const preferences = await prisma.userPreference.upsert({
      where: { userId }, create: { userId }, update: {}
    });
    return NextResponse.json({ preferences });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = userPreferenceSchema.parse(await request.json());
    const preferences = await prisma.userPreference.upsert({
      where: { userId }, create: { userId, ...input }, update: input
    });
    return NextResponse.json({ preferences });
  } catch (error) { return apiError(error); }
}
