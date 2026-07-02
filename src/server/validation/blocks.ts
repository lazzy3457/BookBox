import { z } from "zod";

export const blockMutationSchema = z.object({
  userId: z.string().min(1).max(120)
});
