import { ReactionKind } from "@prisma/client";
import { z } from "zod";

export const reviewMutationSchema = z.object({
  bookId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(5000).optional(),
  spoiler: z.boolean().default(false)
});

export const reactionMutationSchema = z.object({
  kind: z.nativeEnum(ReactionKind)
});

export const commentMutationSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  parentId: z.string().optional()
});
