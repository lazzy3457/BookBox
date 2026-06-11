import { z } from "zod";

export const listMutationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
  isPublic: z.boolean().default(true)
});
