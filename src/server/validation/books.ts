import { z } from "zod";
import { GENRE_SLUGS, MAX_BOOK_GENRES } from "@/lib/genres";

const webUrlSchema = z.string().trim().max(2000).url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "L’URL doit utiliser HTTP ou HTTPS.");

const authorSchema = z.string().trim().min(1).max(120);

const genresSchema = z.array(z.enum(GENRE_SLUGS)).max(MAX_BOOK_GENRES).default([]);

const MAX_BOOK_ISBNS = 20;
const isbnPattern = /^[0-9X-]{10,20}$/i;

// Une liste d'ISBN trop longue ou contenant une valeur mal formée ne doit pas
// empêcher d'enregistrer le livre : on garde les ISBN valides, 20 au plus.
const isbnListSchema = z.preprocess(
  (value) => (Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter((item) => isbnPattern.test(item)))].slice(0, MAX_BOOK_ISBNS)
    : value),
  z.array(z.string().regex(isbnPattern)).max(MAX_BOOK_ISBNS).default([])
);

export const searchBooksSchema = z.object({
  q: z.string().trim().min(2, "Recherche trop courte.").max(120),
  // Ancien curseur unique, gardé pour les clients qui ne connaissent pas les
  // curseurs par source ci-dessous.
  startIndex: z.coerce.number().int().min(0).default(0),
  googleStart: z.coerce.number().int().min(0).optional(),
  openLibraryStart: z.coerce.number().int().min(0).optional(),
  pageSize: z.coerce.number().int().min(1).max(40).default(10),
  mode: z.enum(["all", "title", "author", "isbn"]).default("all"),
  language: z.string().trim().max(24).default("all"),
  source: z.enum(["all", "google_books", "open_library"]).default("all")
});

export const manualBookSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(180),
  authors: z.array(authorSchema).min(1, "Au moins un auteur est obligatoire.").max(20),
  description: z.string().trim().max(4000).optional(),
  thumbnailUrl: webUrlSchema.optional(),
  publishedDate: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(180).optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().max(16).optional(),
  genres: genresSchema
});

export const googleBookUpsertSchema = z.object({
  googleBooksVolumeId: z.string().trim().min(1),
  externalId: z.string().trim().optional(),
  source: z.enum(["google_books"]).optional(),
  title: z.string().trim().min(1).max(180),
  authors: z.array(authorSchema).max(20).default([]),
  description: z.string().trim().max(10_000).optional(),
  thumbnailUrl: webUrlSchema.optional(),
  publishedDate: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(180).optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().max(16).optional(),
  genres: genresSchema,
  isbn10: isbnListSchema,
  isbn13: isbnListSchema
});

export const externalBookUpsertSchema = z.object({
  externalId: z.string().trim().optional(),
  source: z.enum(["google_books", "open_library"]).optional(),
  googleBooksVolumeId: z.string().trim().min(1).optional(),
  openLibraryKey: z.string().trim().min(1).optional(),
  isbn10: isbnListSchema,
  isbn13: isbnListSchema,
  title: z.string().trim().min(1).max(180),
  authors: z.array(authorSchema).max(20).default([]),
  description: z.string().trim().max(10_000).optional(),
  thumbnailUrl: webUrlSchema.optional(),
  publishedDate: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(180).optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().trim().max(16).optional(),
  genres: genresSchema
});

// Nombre de pages saisi par un lecteur quand aucune source ne le connaît.
export const bookPageCountSchema = z.object({
  pageCount: z.number().int("Indique un nombre entier de pages.").min(1, "Indique un nombre de pages.").max(20_000, "Ce nombre de pages est trop grand.")
});
