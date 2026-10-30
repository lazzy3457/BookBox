import { z } from "zod";

export const accountDeletionSchema = z.object({
  // Absent pour un compte sans mot de passe (créé via Google), qui prouve son identité par une connexion Google récente.
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(120).optional(),
  confirmation: z.literal("SUPPRIMER MON COMPTE", {
    error: "Recopie exactement « SUPPRIMER MON COMPTE »."
  })
});
