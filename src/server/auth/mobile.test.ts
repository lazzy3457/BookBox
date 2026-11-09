import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findRevoked, upsertRevoked } = vi.hoisted(() => ({ findUnique: vi.fn(), findRevoked: vi.fn(), upsertRevoked: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { findUnique }, revokedMobileToken: { findUnique: findRevoked, upsert: upsertRevoked } }
}));

import { createMobileToken, getMobileUserId, revokeMobileToken, verifyMobileToken } from "@/server/auth/mobile";

function requestWith(token: string) {
  return new Request("https://booksbox.test", { headers: { authorization: `Bearer ${token}` } });
}

describe("jetons mobiles", () => {
  const user = { id: "user-1", email: "lectrice@example.com", name: "Lectrice", sessionVersion: 2 };

  beforeEach(() => {
    findUnique.mockReset();
    findRevoked.mockReset().mockResolvedValue(null);
    upsertRevoked.mockReset();
  });

  it("accepte un jeton émis pour la version de session courante", async () => {
    findUnique.mockResolvedValue({ sessionVersion: 2 });
    await expect(getMobileUserId(requestWith(createMobileToken(user)))).resolves.toBe("user-1");
  });

  it("refuse un jeton émis avant un changement de mot de passe", async () => {
    findUnique.mockResolvedValue({ sessionVersion: 3 });
    await expect(getMobileUserId(requestWith(createMobileToken(user)))).resolves.toBeNull();
  });

  it("refuse un jeton dont le compte n'existe plus", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getMobileUserId(requestWith(createMobileToken(user)))).resolves.toBeNull();
  });

  it("refuse un jeton révoqué par une déconnexion", async () => {
    findUnique.mockResolvedValue({ sessionVersion: 2 });
    const token = createMobileToken(user);
    await revokeMobileToken(requestWith(token));
    expect(upsertRevoked).toHaveBeenCalledWith(expect.objectContaining({ where: { jti: verifyMobileToken(token)?.jti } }));

    findRevoked.mockResolvedValue({ jti: verifyMobileToken(token)?.jti });
    await expect(getMobileUserId(requestWith(token))).resolves.toBeNull();
  });

  it("refuse un jeton falsifié sans interroger la base", async () => {
    const forged = `${createMobileToken(user).slice(0, -2)}xx`;
    await expect(getMobileUserId(requestWith(forged))).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
