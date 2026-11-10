import { prisma } from "@/server/db/prisma";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/server/auth/password";
import { enforceLoginRateLimit, type HeaderSource } from "@/server/security/rateLimit";
import { credentialsSchema } from "@/server/validation/auth";
import { AUTH_ERRORS } from "@/lib/authErrors";

const publicErrorCodes = new Set<string>([AUTH_ERRORS.EMAIL_NOT_VERIFIED, AUTH_ERRORS.RATE_LIMITED]);

// NextAuth renvoie tel quel au client le message d'une erreur levée dans `authorize`.
function toPublicError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && publicErrorCodes.has(code)) return new Error(code);
  console.error("[auth] Échec inattendu de la connexion par mot de passe.", error);
  return new Error(AUTH_ERRORS.SIGNIN_UNAVAILABLE);
}

async function checkCredentials(email: string, password: string, headers?: HeaderSource) {
  await enforceLoginRateLimit(email, headers);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
      emailVerified: true,
      suspendedAt: true,
      sessionVersion: true
    }
  });

  const isValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user?.passwordHash || isValid !== true || user.suspendedAt) {
    return null;
  }

  // Contrôlé après le mot de passe : seul le titulaire du compte apprend que l'e-mail reste à confirmer.
  if (!user.emailVerified) {
    throw Object.assign(new Error("Adresse e-mail non vérifiée."), { code: AUTH_ERRORS.EMAIL_NOT_VERIFIED });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    sessionVersion: user.sessionVersion
  };
}

export async function authorizeCredentials(credentials: Record<string, string> | undefined, headers?: HeaderSource) {
  const parsed = credentialsSchema.safeParse(credentials ?? {});

  if (!parsed.success) {
    return null;
  }

  try {
    return await checkCredentials(parsed.data.email, parsed.data.password, headers);
  } catch (error) {
    throw toPublicError(error);
  }
}
