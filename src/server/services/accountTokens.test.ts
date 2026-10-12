import { describe, expect, it } from "vitest";
import { hashAccountToken } from "@/server/services/accountTokens";

describe("account tokens", () => {
  it("hashes tokens deterministically without retaining the raw value", () => {
    const token = "a-secure-single-use-token";
    const hash = hashAccountToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(hashAccountToken(token)).toBe(hash);
    expect(hashAccountToken(`${token}-other`)).not.toBe(hash);
  });
});
