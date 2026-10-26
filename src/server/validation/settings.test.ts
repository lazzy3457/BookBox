import { describe, expect, it } from "vitest";
import { passwordSettingsSchema, profileSettingsSchema, userPreferenceSchema } from "./settings";

describe("settings validation", () => {
  it("normalise et valide un profil", () => {
    const result = profileSettingsSchema.parse({
      name: "Maël", username: "Mael_Lit", bio: "Lecteur", image: "https://example.com/avatar.jpg"
    });
    expect(result.username).toBe("mael_lit");
  });

  it("refuse un pseudo ou un avatar invalides", () => {
    expect(profileSettingsSchema.safeParse({ name: "Maël", username: "mael-lit", bio: "", image: "" }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ name: "Maël", username: "mael_lit", bio: "", image: "avatar" }).success).toBe(false);
  });

  it("refuse une confirmation différente", () => {
    const result = passwordSettingsSchema.safeParse({
      currentPassword: "ancien-secret", newPassword: "nouveau-secret", confirmation: "autre-secret"
    });
    expect(result.success).toBe(false);
  });

  it("valide la préférence de spoilers", () => {
    expect(userPreferenceSchema.parse({ hideSpoilers: true })).toEqual({ hideSpoilers: true });
  });

  it("valide le thème et refuse un thème inconnu ou un patch vide", () => {
    expect(userPreferenceSchema.parse({ theme: "nuit" })).toEqual({ theme: "nuit" });
    expect(userPreferenceSchema.safeParse({ theme: "neon" }).success).toBe(false);
    expect(userPreferenceSchema.safeParse({}).success).toBe(false);
  });
});
