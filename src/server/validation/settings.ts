import { z } from "zod";

const optionalAvatar = z.union([
  z.literal(""),
  z.string().trim().url("L’avatar doit être une URL valide.").max(500)
    .refine((value) => value.startsWith("https://"), "L’avatar doit être une URL https://.")
]);

export const profileSettingsSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80),
  username: z.string().trim().toLowerCase()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Utilise uniquement des lettres, chiffres et underscores."),
  bio: z.string().trim().max(500, "La bio ne peut pas dépasser 500 caractères."),
  image: optionalAvatar
});

export const userPreferenceSchema = z.object({
  hideSpoilers: z.boolean()
});

export const passwordSettingsSchema = z.object({
  currentPassword: z.string().min(1, "Saisis ton mot de passe actuel."),
  newPassword: z.string().min(10, "Le nouveau mot de passe doit contenir au moins 10 caractères.").max(128),
  confirmation: z.string()
}).superRefine((value, context) => {
  if (value.newPassword !== value.confirmation) {
    context.addIssue({ code: "custom", path: ["confirmation"], message: "Les mots de passe ne correspondent pas." });
  }
  if (value.currentPassword === value.newPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Choisis un mot de passe différent." });
  }
});
