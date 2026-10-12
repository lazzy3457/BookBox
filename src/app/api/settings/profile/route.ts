import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { profileSettingsSchema } from "@/server/validation/settings";

const select = {
  name: true, username: true, email: true, emailVerified: true,
  image: true, bio: true, createdAt: true
} as const;

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    return NextResponse.json({ profile: await prisma.user.findUniqueOrThrow({ where: { id: userId }, select }) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = profileSettingsSchema.parse(await request.json());
    const conflict = await prisma.user.findFirst({ where: { username: input.username, id: { not: userId } }, select: { id: true } });
    if (conflict) throw Object.assign(new Error("Ce pseudo est déjà utilisé."), { status: 409 });
    const profile = await prisma.user.update({
      where: { id: userId },
      data: { ...input, image: input.image || null, bio: input.bio || null },
      select
    });
    return NextResponse.json({ profile });
  } catch (error) { return apiError(error); }
}
