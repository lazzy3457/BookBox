import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { $queryRaw: queryRaw }
}));

import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";

describe("rate limiting", () => {
  beforeEach(() => queryRaw.mockReset());

  it("uses the first forwarded client address", () => {
    const request = new Request("https://booksbox.test", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.2" }
    });
    expect(getClientIdentifier(request)).toBe("203.0.113.8");
  });

  it("rejects requests above the configured limit", async () => {
    queryRaw.mockResolvedValue([{ count: 4, resetAt: new Date(Date.now() + 30_000) }]);
    await expect(enforceRateLimit({
      scope: "test",
      identifier: "reader",
      limit: 3,
      windowMs: 60_000
    })).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });
});
