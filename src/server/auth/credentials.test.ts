import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, enforceRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  enforceRateLimit: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/server/security/rateLimit", () => ({ enforceRateLimit }));
vi.mock("@/server/auth/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/password")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

import { authorizeCredentials } from "@/server/auth/credentials";
import { verifyPassword } from "@/server/auth/password";

const PASSWORD = "mot-de-passe-solide";
let passwordHash = "";

function storedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    email: "lectrice@example.com",
    name: "Lectrice",
    image: null,
    passwordHash,
    emailVerified: new Date("2026-10-01"),
    suspendedAt: null,
    sessionVersion: 3,
    ...overrides
  };
}

describe("connexion par mot de passe", () => {
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    findUnique.mockReset();
    enforceRateLimit.mockReset().mockResolvedValue(undefined);
    vi.mocked(verifyPassword).mockClear();
  });

  it("connecte un compte vérifié dont le mot de passe correspond au hash", async () => {
    findUnique.mockResolvedValue(storedUser());
    const user = await authorizeCredentials({ email: "  Lectrice@Example.com ", password: PASSWORD });

    expect(user).toEqual({ id: "user_1", email: "lectrice@example.com", name: "Lectrice", image: null, sessionVersion: 3 });
    expect(user).not.toHaveProperty("passwordHash");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "lectrice@example.com" } }));
  });

  it("refuse un mauvais mot de passe", async () => {
    findUnique.mockResolvedValue(storedUser());
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: "mauvais-mot-de-passe" })).resolves.toBeNull();
  });

  it("refuse un compte sans mot de passe (créé via Google)", async () => {
    findUnique.mockResolvedValue(storedUser({ passwordHash: null }));
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: PASSWORD })).resolves.toBeNull();
  });

  it("vérifie quand même un hash pour une adresse inconnue, sans révéler son absence", async () => {
    findUnique.mockResolvedValue(null);
    await expect(authorizeCredentials({ email: "inconnue@example.com", password: PASSWORD })).resolves.toBeNull();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("bloque un e-mail non vérifié avec un code explicite", async () => {
    findUnique.mockResolvedValue(storedUser({ emailVerified: null }));
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: PASSWORD })).rejects.toThrow(/^EMAIL_NOT_VERIFIED$/);
  });

  it("ne révèle pas qu'un e-mail est non vérifié sans le bon mot de passe", async () => {
    findUnique.mockResolvedValue(storedUser({ emailVerified: null }));
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: "mauvais-mot-de-passe" })).resolves.toBeNull();
  });

  it("refuse un compte suspendu", async () => {
    findUnique.mockResolvedValue(storedUser({ suspendedAt: new Date() }));
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: PASSWORD })).resolves.toBeNull();
  });

  it("refuse les identifiants absents ou invalides sans interroger la base", async () => {
    await expect(authorizeCredentials(undefined)).resolves.toBeNull();
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: "" })).resolves.toBeNull();
    await expect(authorizeCredentials({ email: "pas-un-email", password: PASSWORD })).resolves.toBeNull();
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: "x".repeat(121) })).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("transmet le blocage anti-force brute sous forme de code", async () => {
    enforceRateLimit.mockRejectedValue(Object.assign(new Error("Trop de tentatives."), { status: 429, code: "RATE_LIMITED" }));
    await expect(authorizeCredentials({ email: "lectrice@example.com", password: PASSWORD })).rejects.toThrow(/^RATE_LIMITED$/);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("masque les erreurs internes derrière un code générique", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    findUnique.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 (prisma)"));

    await expect(authorizeCredentials({ email: "lectrice@example.com", password: PASSWORD })).rejects.toThrow(/^SIGNIN_UNAVAILABLE$/);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
