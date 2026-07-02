import { z } from "zod";

export const accountDeletionSchema = z.object({
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(120),
  confirmation: z.literal("SUPPRIMER MON COMPTE", {
    error: "Recopie exactement « SUPPRIMER MON COMPTE »."
  })
});
