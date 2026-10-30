import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { hasRecentGoogleSignIn, requireCurrentUserId } from "@/server/auth/session";
import { apiError, badRequest, notFound } from "@/server/http/errors";
import { verifyPassword } from "@/server/auth/password";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { accountDeletionSchema } from "@/server/validation/account";

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({
      scope: "account-delete",
      identifier: userId,
      limit: 5,
      windowMs: 60 * 60_000
    });
    const input = accountDeletionSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true }
    });
    if (!user) throw notFound("Compte introuvable.", "ACCOUNT_NOT_FOUND");
    if (user.passwordHash) {
      if (!input.password) throw badRequest("Le mot de passe est obligatoire.", "VALIDATION_ERROR");
      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw Object.assign(new Error("Le mot de passe est incorrect."), {
          status: 403,
          code: "INVALID_PASSWORD"
        });
      }
    } else if (!(await hasRecentGoogleSignIn(user.id))) {
      throw Object.assign(new Error("Reconnecte-toi avec Google pour confirmer la suppression de ton compte."), {
        status: 403,
        code: "REAUTH_REQUIRED"
      });
    }
    await prisma.$transaction(async (transaction) => {
      if (user.email) {
        await transaction.moderationAppeal.deleteMany({ where: { email: user.email } });
        await transaction.legalNotice.deleteMany({ where: { reporterEmail: user.email } });
      }
      await transaction.user.delete({ where: { id: user.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
