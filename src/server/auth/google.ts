import type { Account, Profile } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { legalConfig } from "@/lib/legal";
import { AUTH_ERRORS } from "@/lib/authErrors";

const CONSENT_COOKIE = "booksbox_google_consent";
const CONSENT_TTL_SECONDS = 10 * 60;

export function isGoogleAuthEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleProvider() {
  return GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    // Liaison par e-mail sûre uniquement parce que checkGoogleSignIn refuse toute adresse non vérifiée par Google.
    allowDangerousEmailAccountLinking: true,
    profile(profile) {
      return { id: profile.sub, name: profile.name, email: profile.email.toLowerCase(), image: profile.picture };
    }
  });
}

// Valeur non signée : comme les cases du formulaire d'inscription, c'est une déclaration de la personne.
export function googleSignupConsentCookie(now = Date.now()) {
  return {
    name: CONSENT_COOKIE,
    value: [legalConfig.termsVersion, legalConfig.privacyVersion, now].join("|"),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: CONSENT_TTL_SECONDS
  };
}

async function readGoogleSignupConsent() {
  const value = (await cookies()).get(CONSENT_COOKIE)?.value;
  const [termsVersion, privacyVersion, confirmedAt] = value?.split("|") ?? [];
  const age = Date.now() - Number(confirmedAt);

  if (termsVersion !== legalConfig.termsVersion || privacyVersion !== legalConfig.privacyVersion || !(age >= 0 && age <= CONSENT_TTL_SECONDS * 1000)) {
    return null;
  }

  return { termsVersion, privacyVersion, ageConfirmedAt: new Date(Number(confirmedAt)) };
}

// Callback `signIn` de NextAuth pour Google, appelé avant toute liaison ou création de compte.
export async function checkGoogleSignIn(account: Account, profile: Profile | undefined) {
  const googleProfile = profile as GoogleProfile | undefined;

  if (googleProfile?.email_verified !== true || !googleProfile.email) {
    return `/login?error=${AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED}`;
  }

  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
    select: { user: { select: { suspendedAt: true } } }
  });

  if (linked) {
    return !linked.user.suspendedAt;
  }

  const existing = await prisma.user.findUnique({
    where: { email: googleProfile.email.toLowerCase() },
    select: { id: true, emailVerified: true, suspendedAt: true }
  });

  if (existing) {
    if (existing.suspendedAt) return false;

    if (!existing.emailVerified) {
      // Ce mot de passe a été choisi sans prouver la possession de l'adresse : le garder laisserait
      // quiconque a pré-inscrit l'adresse entrer dans le compte une fois Google lié.
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: new Date(), passwordHash: null }
      });
    }

    return true;
  }

  return (await readGoogleSignupConsent()) ? true : `/signup?error=${AUTH_ERRORS.GOOGLE_SIGNUP_CONSENT_REQUIRED}`;
}

// Heure d'une connexion Google, gardée dans le JWT comme preuve de ré-authentification :
// NextAuth renouvelle `iat` à chaque lecture de session, il ne date donc pas la connexion.
export function googleSignInTime(account: Account, profile: Profile | undefined, user: { email?: string | null }, now = Date.now()) {
  if (account.provider !== "google") return undefined;
  // Pendant une session ouverte, NextAuth lie au compte courant tout compte Google encore inconnu :
  // seule l'adresse du compte BooksBox montre que c'est son titulaire qui vient de se reconnecter.
  const email = profile?.email?.toLowerCase();
  return email && email === user.email?.toLowerCase() ? now : undefined;
}

// Remplace `createUser` de l'adaptateur Prisma, qui n'est appelé que pour une première connexion Google :
// l'inscription par mot de passe passe par /api/auth/signup.
export async function createGoogleUser(data: Omit<AdapterUser, "id">) {
  const consent = await readGoogleSignupConsent();

  if (!consent) {
    throw new Error(AUTH_ERRORS.GOOGLE_SIGNUP_CONSENT_REQUIRED);
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      image: data.image,
      // checkGoogleSignIn a déjà exigé email_verified côté Google.
      emailVerified: new Date(),
      legalAcceptances: {
        create: {
          termsVersion: consent.termsVersion,
          privacyVersion: consent.privacyVersion,
          ageConfirmedAt: consent.ageConfirmedAt,
          source: "WEB"
        }
      }
    }
  });

  return user as AdapterUser;
}
