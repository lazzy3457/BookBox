import { ReactionKind } from "@prisma/client";
import { z } from "zod";
import { MAX_CHAPTER } from "@/lib/chapters";

export const reviewMutationSchema = z.object({
  bookId: z.string().min(1),
  // 0 (par défaut) = avis sur le livre entier ; sinon le numéro du chapitre.
  chapter: z.number().int().min(0).max(MAX_CHAPTER).default(0),
  rating: z.number().min(0.5).max(5).multipleOf(0.5),
  body: z.string().trim().max(5000).optional(),
  spoiler: z.boolean().default(false)
});

export const chapterProgressSchema = z.object({
  chapter: z.number().int().min(0).max(MAX_CHAPTER)
});

export const reactionMutationSchema = z.object({
  kind: z.nativeEnum(ReactionKind)
});

export const commentMutationSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  parentId: z.string().optional()
});
