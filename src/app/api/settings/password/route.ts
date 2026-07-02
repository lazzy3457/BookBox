import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { passwordSettingsSchema } from "@/server/validation/settings";

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "password-change", identifier: userId, limit: 5, windowMs: 60 * 60_000 });
    const input = passwordSettingsSchema.parse(await request.json());
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
    if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw Object.assign(new Error("Le mot de passe actuel est incorrect."), { status: 400 });
    }
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } }
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
