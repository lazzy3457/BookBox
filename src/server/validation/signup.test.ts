import { describe, expect, it } from "vitest";
import { signupSchema } from "@/app/api/auth/signup/route";
import { legalConfig } from "@/lib/legal";

const validSignup = {
  name: "Lectrice",
  username: "lectrice_15",
  email: "lectrice@example.com",
  password: "mot-de-passe-solide",
  ageConfirmed: true,
  termsAccepted: true,
  termsVersion: legalConfig.termsVersion,
  privacyVersion: legalConfig.privacyVersion
};

describe("signup compliance", () => {
  it("accepts the current legal versions and age confirmation", () => {
    expect(signupSchema.parse(validSignup).email).toBe(validSignup.email);
  });

  it("rejects missing consent, age confirmation, and stale versions", () => {
    expect(() => signupSchema.parse({ ...validSignup, ageConfirmed: false })).toThrow();
    expect(() => signupSchema.parse({ ...validSignup, termsAccepted: false })).toThrow();
    expect(() => signupSchema.parse({ ...validSignup, termsVersion: "old" })).toThrow();
  });
});
