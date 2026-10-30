import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, findFirst, findUniqueOrThrow, update, enforceRateLimit, sendPasswordResetEmail } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  enforceRateLimit: vi.fn(),
  sendPasswordResetEmail: vi.fn()
}));

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/server/auth/options", () => ({ authOptions: {} }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findFirst, findUniqueOrThrow, update } } }));
vi.mock("@/server/security/rateLimit", () => ({ enforceRateLimit }));
vi.mock("@/server/services/accountTokens", () => ({ sendPasswordResetEmail }));
vi.mock("@/server/auth/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/password")>();
  return { ...actual, hashPassword: vi.fn(async () => "nouveau-hash") };
});

import { PATCH, POST } from "@/app/api/settings/password/route";

const PASSWORD = "mot-de-passe-solide";
let passwordHash = "";

function storedUser(overrides: Record<string, unknown> = {}) {
  findUniqueOrThrow.mockResolvedValue({ email: "lectrice@example.com", passwordHash, ...overrides });
}

async function call(handler: (request: Request) => Promise<Response>, method: string, body?: Record<string, unknown>) {
  const response = await handler(new Request("http://localhost/api/settings/password", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  }));
  return { status: response.status, payload: await response.json() };
}

const change = { currentPassword: PASSWORD, newPassword: "nouveau-mot-de-passe", confirmation: "nouveau-mot-de-passe" };

describe("mot de passe dans les paramètres", () => {
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    for (const mock of [getServerSession, findFirst, findUniqueOrThrow, update, enforceRateLimit, sendPasswordResetEmail]) mock.mockReset();
    getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    findFirst.mockResolvedValue({ id: "user_1" });
    enforceRateLimit.mockResolvedValue(undefined);
    sendPasswordResetEmail.mockResolvedValue(true);
  });

  it("change le mot de passe d'un compte qui en a un", async () => {
    storedUser();
    const { status } = await call(PATCH, "PATCH", change);

    expect(status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "user_1" }, data: { passwordHash: "nouveau-hash", sessionVersion: { increment: 1 } } });
  });

  it("refuse le changement direct pour un compte sans mot de passe", async () => {
    storedUser({ passwordHash: null });
    const { status, payload } = await call(PATCH, "PATCH", change);

    expect(status).toBe(400);
    expect(payload.error.code).toBe("PASSWORD_NOT_SET");
    expect(update).not.toHaveBeenCalled();
  });

  it("envoie un lien pour définir le mot de passe d'un compte qui n'en a pas", async () => {
    storedUser({ passwordHash: null });
    const { status } = await call(POST, "POST");

    expect(status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({ id: "user_1", email: "lectrice@example.com" });
  });

  it("n'envoie pas de lien à un compte qui a déjà un mot de passe", async () => {
    storedUser();
    const { status, payload } = await call(POST, "POST");

    expect(status).toBe(409);
    expect(payload.error.code).toBe("PASSWORD_ALREADY_SET");
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
