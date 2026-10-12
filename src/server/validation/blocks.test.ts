import { describe, expect, it } from "vitest";
import { blockMutationSchema } from "@/server/validation/blocks";

describe("block validation", () => {
  it("accepts a valid target user id", () => {
    expect(blockMutationSchema.parse({ userId: "user_123" })).toEqual({ userId: "user_123" });
  });

  it("rejects an empty or oversized target user id", () => {
    expect(() => blockMutationSchema.parse({ userId: "" })).toThrow();
    expect(() => blockMutationSchema.parse({ userId: "x".repeat(121) })).toThrow();
  });
});
