import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getMobileUserId } from "@/server/auth/mobile";
import { prisma } from "@/server/db/prisma";

const RECENT_SIGN_IN_MS = 5 * 60_000;

export function isRecentGoogleSignIn(signedInAt: number | undefined, now = Date.now()) {
  return typeof signedInAt === "number" && now - signedInAt <= RECENT_SIGN_IN_MS;
}

// Preuve d'identité des comptes sans mot de passe : une connexion Google de moins de 5 minutes
// dans la session web de ce même compte (un jeton mobile n'en porte jamais).
export async function hasRecentGoogleSignIn(userId: string) {
  const session = await getServerSession(authOptions);
  return session?.user?.id === userId && isRecentGoogleSignIn(session.googleSignInAt);
}

export async function getCurrentUserId(request?: Request) {
  if (request) {
    const mobileUserId = await getMobileUserId(request);

    if (mobileUserId) {
      return mobileUserId;
    }
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireCurrentUserId(request?: Request) {
  if (request && !request.headers.get("authorization")?.startsWith("Bearer ")) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const configuredOrigin = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (fetchSite === "cross-site" || (origin && configuredOrigin && new URL(origin).origin !== new URL(configuredOrigin).origin)) {
      throw Object.assign(new Error("Origine de la requête refusée."), { status: 403, code: "ORIGIN_FORBIDDEN" });
    }
  }
  const userId = await getCurrentUserId(request);

  if (!userId) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }
  const activeUser = await prisma.user.findFirst({ where: { id: userId, suspendedAt: null }, select: { id: true } });
  if (!activeUser) {
    throw Object.assign(new Error("Ce compte n’est pas autorisé à effectuer cette action."), { status: 403, code: "ACCOUNT_SUSPENDED" });
  }

  return userId;
}
