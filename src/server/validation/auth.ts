import { z } from "zod";
import { legalConfig } from "@/lib/legal";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(120)
});

// Mêmes engagements que l'inscription par mot de passe, recueillis avant de partir chez Google.
export const googleSignupConsentSchema = z.object({
  ageConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
  termsVersion: z.literal(legalConfig.termsVersion),
  privacyVersion: z.literal(legalConfig.privacyVersion)
});
