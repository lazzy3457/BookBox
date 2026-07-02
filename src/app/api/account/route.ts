import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
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
      select: { id: true, passwordHash: true }
    });
    if (!user) throw notFound("Compte introuvable.", "ACCOUNT_NOT_FOUND");
    if (!user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw Object.assign(new Error("Le mot de passe est incorrect."), {
        status: 403,
        code: "INVALID_PASSWORD"
      });
    }
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    await prisma.$transaction(async (transaction) => {
      if (account?.email) {
        await transaction.moderationAppeal.deleteMany({ where: { email: account.email } });
        await transaction.legalNotice.deleteMany({ where: { reporterEmail: account.email } });
      }
      await transaction.user.delete({ where: { id: user.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
