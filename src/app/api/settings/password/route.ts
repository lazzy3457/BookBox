import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/server/db/prisma";
import { apiError, conflict } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { sendPasswordResetEmail } from "@/server/services/accountTokens";
import { passwordSettingsSchema } from "@/server/validation/settings";

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "password-change", identifier: userId, limit: 5, windowMs: 60 * 60_000 });
    const input = passwordSettingsSchema.parse(await request.json());
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
    if (!user.passwordHash) {
      throw Object.assign(new Error("Ce compte n’a pas encore de mot de passe : utilise « Définir un mot de passe »."), { status: 400, code: "PASSWORD_NOT_SET" });
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
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

// Compte sans mot de passe (créé via Google) : le mot de passe se choisit depuis un lien envoyé à l'adresse
// du compte, pour qu'une session volée ne suffise pas à en poser un.
export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "password-setup", identifier: userId, limit: 3, windowMs: 60 * 60_000 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true } });
    if (user.passwordHash) throw conflict("Ce compte a déjà un mot de passe : modifie-le avec le formulaire.", "PASSWORD_ALREADY_SET");
    if (!user.email) throw Object.assign(new Error("Aucune adresse e-mail n’est associée à ce compte."), { status: 400, code: "EMAIL_MISSING" });
    await sendPasswordResetEmail({ id: userId, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
