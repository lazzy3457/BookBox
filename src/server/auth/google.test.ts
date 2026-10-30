import type { Account, Profile } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieValue, accountFindUnique, userFindUnique, userUpdate, userCreate } = vi.hoisted(() => ({
  cookieValue: { current: undefined as string | undefined },
  accountFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue.current === undefined ? undefined : { value: cookieValue.current }) })
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    account: { findUnique: accountFindUnique },
    user: { findUnique: userFindUnique, update: userUpdate, create: userCreate }
  }
}));

import { checkGoogleSignIn, createGoogleUser, googleProvider, googleSignupConsentCookie } from "@/server/auth/google";

const account = { provider: "google", providerAccountId: "google-sub-1", type: "oauth" } as Account;

function googleProfile(overrides: Record<string, unknown> = {}) {
  return { sub: "google-sub-1", email: "Lectrice@Example.com", email_verified: true, name: "Lectrice", ...overrides } as Profile;
}

describe("connexion Google", () => {
  beforeEach(() => {
    cookieValue.current = undefined;
    for (const mock of [accountFindUnique, userFindUnique, userUpdate, userCreate]) mock.mockReset();
    accountFindUnique.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
  });

  it("active la liaison automatique par e-mail et normalise l'adresse", async () => {
    const provider = googleProvider();
    expect(provider.options?.allowDangerousEmailAccountLinking).toBe(true);
    const user = await provider.options?.profile?.({ sub: "1", email: "Lectrice@Gmail.com", name: "L", picture: "p" } as never, {});
    expect(user?.email).toBe("lectrice@gmail.com");
  });

  it("refuse une adresse que Google ne garantit pas vérifiée", async () => {
    await expect(checkGoogleSignIn(account, googleProfile({ email_verified: false }))).resolves.toBe("/login?error=GOOGLE_EMAIL_NOT_VERIFIED");
    await expect(checkGoogleSignIn(account, googleProfile({ email_verified: "true" }))).resolves.toBe("/login?error=GOOGLE_EMAIL_NOT_VERIFIED");
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("lie un compte existant et vérifié sans toucher à son mot de passe", async () => {
    userFindUnique.mockResolvedValue({ id: "user_1", emailVerified: new Date(), suspendedAt: null });
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe(true);
    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "lectrice@example.com" } }));
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("retire le mot de passe d'un compte pré-inscrit non vérifié avant de le lier", async () => {
    userFindUnique.mockResolvedValue({ id: "user_1", emailVerified: null, suspendedAt: null });
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe(true);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { emailVerified: expect.any(Date), passwordHash: null }
    });
  });

  it("refuse un compte suspendu, lié ou non", async () => {
    userFindUnique.mockResolvedValue({ id: "user_1", emailVerified: new Date(), suspendedAt: new Date() });
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe(false);

    accountFindUnique.mockResolvedValue({ user: { suspendedAt: new Date() } });
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe(false);
  });

  it("exige l'acceptation des conditions avant de créer un compte", async () => {
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe("/signup?error=GOOGLE_SIGNUP_CONSENT_REQUIRED");

    cookieValue.current = googleSignupConsentCookie().value;
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe(true);
  });

  it("ignore un consentement expiré ou portant sur d'anciennes versions", async () => {
    cookieValue.current = googleSignupConsentCookie(Date.now() - 11 * 60_000).value;
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe("/signup?error=GOOGLE_SIGNUP_CONSENT_REQUIRED");

    cookieValue.current = `ancienne-version|ancienne-version|${Date.now()}`;
    await expect(checkGoogleSignIn(account, googleProfile())).resolves.toBe("/signup?error=GOOGLE_SIGNUP_CONSENT_REQUIRED");
  });

  it("crée le compte vérifié avec la trace d'acceptation des conditions", async () => {
    await expect(createGoogleUser({ email: "lectrice@gmail.com", emailVerified: null, name: "Lectrice" })).rejects.toThrow("GOOGLE_SIGNUP_CONSENT_REQUIRED");
    expect(userCreate).not.toHaveBeenCalled();

    cookieValue.current = googleSignupConsentCookie().value;
    userCreate.mockResolvedValue({ id: "user_2" });
    await createGoogleUser({ email: "Lectrice@Gmail.com", emailVerified: null, name: "Lectrice" });

    const { data } = userCreate.mock.calls[0][0];
    expect(data.email).toBe("lectrice@gmail.com");
    expect(data.emailVerified).toBeInstanceOf(Date);
    expect(data.legalAcceptances.create).toMatchObject({ source: "WEB", ageConfirmedAt: expect.any(Date) });
  });
});
