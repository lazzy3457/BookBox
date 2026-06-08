import { z } from "zod";

export const searchBooksSchema = z.object({
  q: z.string().trim().min(2, "Recherche trop courte.").max(120),
  startIndex: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(40).default(10),
  mode: z.enum(["all", "title", "author", "isbn"]).default("all"),
  language: z.string().trim().max(24).default("all"),
  source: z.enum(["all", "google_books", "open_library"]).default("all")
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
  externalId: z.string().trim().optional(),
  source: z.enum(["google_books"]).optional(),
  title: z.string().trim().min(1),
  authors: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().url().optional(),
  publishedDate: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().optional(),
  isbn10: z.array(z.string().trim().min(1)).default([]),
  isbn13: z.array(z.string().trim().min(1)).default([])
});

export const externalBookUpsertSchema = z.object({
  externalId: z.string().trim().optional(),
  source: z.enum(["google_books", "open_library"]).optional(),
  googleBooksVolumeId: z.string().trim().min(1).optional(),
  openLibraryKey: z.string().trim().min(1).optional(),
  isbn10: z.array(z.string().trim().min(1)).default([]),
  isbn13: z.array(z.string().trim().min(1)).default([]),
  title: z.string().trim().min(1),
  authors: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().url().optional(),
  publishedDate: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().optional()
});
