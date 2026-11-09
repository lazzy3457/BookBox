import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique } } }));

import { createMobileToken, getMobileUserId } from "@/server/auth/mobile";

function requestWith(token: string) {
  return new Request("https://booksbox.test", { headers: { authorization: `Bearer ${token}` } });
}

describe("jetons mobiles", () => {
  const user = { id: "user-1", email: "lectrice@example.com", name: "Lectrice", sessionVersion: 2 };

  beforeEach(() => findUnique.mockReset());

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

  it("refuse un jeton falsifié sans interroger la base", async () => {
    const forged = `${createMobileToken(user).slice(0, -2)}xx`;
    await expect(getMobileUserId(requestWith(forged))).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
