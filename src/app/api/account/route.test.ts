import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, findUnique, findFirst, deleteUser, transaction, enforceRateLimit } = vi.hoisted(() => {
  const deleteUser = vi.fn();
  const tx = {
    moderationAppeal: { deleteMany: vi.fn() },
    legalNotice: { deleteMany: vi.fn() },
    user: { delete: deleteUser }
  };
  return {
    getServerSession: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    deleteUser,
    transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    enforceRateLimit: vi.fn()
  };
});

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/server/auth/options", () => ({ authOptions: {} }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique, findFirst }, $transaction: transaction } }));
vi.mock("@/server/security/rateLimit", () => ({ enforceRateLimit }));

import { DELETE } from "@/app/api/account/route";

const PASSWORD = "mot-de-passe-solide";
const CONFIRMATION = "SUPPRIMER MON COMPTE";
let passwordHash = "";

function signedIn(googleSignInAt?: number) {
  getServerSession.mockResolvedValue({ user: { id: "user_1" }, googleSignInAt });
}

function storedUser(overrides: Record<string, unknown> = {}) {
  findUnique.mockResolvedValue({ id: "user_1", email: "lectrice@example.com", passwordHash, ...overrides });
}

async function deleteAccount(body: Record<string, unknown>) {
  const response = await DELETE(new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
  return { status: response.status, payload: await response.json() };
}

describe("suppression de compte", () => {
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    for (const mock of [getServerSession, findUnique, findFirst, deleteUser, transaction, enforceRateLimit]) mock.mockClear();
    findFirst.mockResolvedValue({ id: "user_1" });
    enforceRateLimit.mockResolvedValue(undefined);
    signedIn();
  });

  describe("compte avec mot de passe", () => {
    it("supprime le compte avec le bon mot de passe et la confirmation", async () => {
      storedUser();
      const { status } = await deleteAccount({ password: PASSWORD, confirmation: CONFIRMATION });

      expect(status).toBe(200);
      expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user_1" } });
    });

    it("refuse un mauvais mot de passe", async () => {
      storedUser();
      const { status, payload } = await deleteAccount({ password: "mauvais-mot-de-passe", confirmation: CONFIRMATION });

      expect(status).toBe(403);
      expect(payload.error.code).toBe("INVALID_PASSWORD");
      expect(transaction).not.toHaveBeenCalled();
    });

    it("exige le mot de passe même juste après une connexion Google", async () => {
      storedUser();
      signedIn(Date.now());
      const { status, payload } = await deleteAccount({ confirmation: CONFIRMATION });

      expect(status).toBe(400);
      expect(payload.error.message).toBe("Le mot de passe est obligatoire.");
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe("compte sans mot de passe (créé via Google)", () => {
    beforeEach(() => storedUser({ passwordHash: null }));

    it("refuse la suppression sans connexion Google récente", async () => {
      const { status, payload } = await deleteAccount({ confirmation: CONFIRMATION });

      expect(status).toBe(403);
      expect(payload.error.code).toBe("REAUTH_REQUIRED");
      expect(transaction).not.toHaveBeenCalled();
    });

    it("refuse un mot de passe quelconque à la place de la connexion Google", async () => {
      const { status, payload } = await deleteAccount({ password: PASSWORD, confirmation: CONFIRMATION });

      expect(status).toBe(403);
      expect(payload.error.code).toBe("REAUTH_REQUIRED");
      expect(transaction).not.toHaveBeenCalled();
    });

    it("refuse une connexion Google de plus de 5 minutes", async () => {
      signedIn(Date.now() - 6 * 60_000);
      const { status, payload } = await deleteAccount({ confirmation: CONFIRMATION });

      expect(status).toBe(403);
      expect(payload.error.code).toBe("REAUTH_REQUIRED");
      expect(transaction).not.toHaveBeenCalled();
    });

    it("supprime le compte après une connexion Google de moins de 5 minutes", async () => {
      signedIn(Date.now() - 4 * 60_000);
      const { status } = await deleteAccount({ confirmation: CONFIRMATION });

      expect(status).toBe(200);
      expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user_1" } });
    });

    it("exige toujours la confirmation recopiée", async () => {
      signedIn(Date.now());
      const { status } = await deleteAccount({ confirmation: "supprimer mon compte" });

      expect(status).toBe(400);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
