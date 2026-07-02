import { ReadingStatus } from "@prisma/client";
import { z } from "zod";

export const libraryMutationSchema = z.object({
  bookId: z.string().min(1),
  status: z.nativeEnum(ReadingStatus)
});

const optionalDate = z.string().date().optional().nullable();

export const readingPeriodSchema = z.object({
  bookId: z.string().min(1),
  startedAt: optionalDate,
  finishedAt: optionalDate,
  isReread: z.boolean().default(false)
}).refine(
  (value) => !value.startedAt || !value.finishedAt || value.finishedAt >= value.startedAt,
  { message: "La date de fin doit être postérieure au début.", path: ["finishedAt"] }
);

export const readingPeriodUpdateSchema = z.object({
  periodId: z.string().min(1),
  startedAt: optionalDate,
  finishedAt: optionalDate,
  isReread: z.boolean().optional()
});

export const readingEntrySchema = z.object({
  periodId: z.string().min(1),
  entryDate: z.string().date(),
  page: z.number().int().positive().optional().nullable(),
  percentage: z.number().int().min(0).max(100).optional().nullable(),
  chapter: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  isPublic: z.boolean().default(false)
}).refine(
  (value) => value.page != null || value.percentage != null || Boolean(value.chapter) || Boolean(value.note),
  { message: "Ajoute une progression, un chapitre ou une note." }
);

export const readingEntryUpdateSchema = z.object({
  entryDate: z.string().date(),
  page: z.number().int().positive().optional().nullable(),
  percentage: z.number().int().min(0).max(100).optional().nullable(),
  chapter: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  isPublic: z.boolean()
}).refine(
  (value) => value.page != null || value.percentage != null || Boolean(value.chapter) || Boolean(value.note),
  { message: "Ajoute une progression, un chapitre ou une note." }
);
