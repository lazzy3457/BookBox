import { z } from "zod";

export const searchBooksSchema = z.object({
  q: z.string().trim().min(2, "Recherche trop courte.").max(120)
});

export const manualBookSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(180),
  authors: z.array(z.string().trim().min(1)).min(1, "Au moins un auteur est obligatoire."),
  description: z.string().trim().max(4000).optional(),
  thumbnailUrl: z.string().trim().url().optional(),
  publishedDate: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(180).optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().max(16).optional()
});

export const googleBookUpsertSchema = z.object({
  googleBooksVolumeId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  authors: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().url().optional(),
  publishedDate: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().optional()
});
