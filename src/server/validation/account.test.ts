import { describe, expect, it } from "vitest";
import { accountDeletionSchema } from "@/server/validation/account";

describe("account deletion validation", () => {
  it("requires the exact destructive confirmation", () => {
    expect(() => accountDeletionSchema.parse({
      password: "password-secret",
      confirmation: "supprimer mon compte"
    })).toThrow();
  });

  it("accepts the exact confirmation with a password", () => {
    expect(accountDeletionSchema.parse({
      password: "password-secret",
      confirmation: "SUPPRIMER MON COMPTE"
    }).confirmation).toBe("SUPPRIMER MON COMPTE");
  });
});
