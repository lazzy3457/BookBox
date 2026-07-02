import { createHash, randomBytes } from "crypto";
import { AccountTokenType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getSiteUrl } from "@/lib/site";
import { sendTransactionalEmail } from "@/server/email/mailer";

const lifetimes = {
  [AccountTokenType.VERIFY_EMAIL]: 24 * 60 * 60_000,
  [AccountTokenType.RESET_PASSWORD]: 30 * 60_000
};

export function hashAccountToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAccountToken(userId: string, type: AccountTokenType) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.accountToken.deleteMany({ where: { userId, type } }),
    prisma.accountToken.create({
      data: { userId, type, tokenHash: hashAccountToken(token), expiresAt: new Date(Date.now() + lifetimes[type]) }
    })
  ]);
  return token;
}

export async function consumeAccountToken(token: string, type: AccountTokenType) {
  const tokenHash = hashAccountToken(token);
  return prisma.$transaction(async (transaction) => {
    const stored = await transaction.accountToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.type !== type || stored.expiresAt <= new Date()) return null;
    await transaction.accountToken.delete({ where: { id: stored.id } });
    return stored.userId;
  });
}

export async function sendVerificationEmail(user: { id: string; email: string }) {
  const token = await createAccountToken(user.id, AccountTokenType.VERIFY_EMAIL);
  const url = new URL(`/verify-email?token=${encodeURIComponent(token)}`, getSiteUrl()).toString();
  return sendTransactionalEmail({
    to: user.email,
    subject: "Vérifie ton adresse BooksBox",
    text: `Vérifie ton adresse BooksBox : ${url}\nCe lien expire dans 24 heures.`,
    html: `<p>Bienvenue sur BooksBox.</p><p><a href="${url}">Vérifier mon adresse e-mail</a></p><p>Ce lien expire dans 24 heures.</p>`
  });
}

export async function sendPasswordResetEmail(user: { id: string; email: string }) {
  const token = await createAccountToken(user.id, AccountTokenType.RESET_PASSWORD);
  const url = new URL(`/reset-password?token=${encodeURIComponent(token)}`, getSiteUrl()).toString();
  return sendTransactionalEmail({
    to: user.email,
    subject: "Réinitialise ton mot de passe BooksBox",
    text: `Réinitialise ton mot de passe BooksBox : ${url}\nCe lien expire dans 30 minutes.`,
    html: `<p>Une réinitialisation de mot de passe a été demandée.</p><p><a href="${url}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 30 minutes.</p>`
  });
}
