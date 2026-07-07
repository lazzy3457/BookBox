import { z } from "zod";

export const reportTargetTypeSchema = z.enum(["USER", "REVIEW", "COMMENT"]);
export const reportReasonSchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "SPOILER",
  "INAPPROPRIATE_CONTENT",
  "OTHER"
]);
export const reportStatusSchema = z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]);
export const moderationActionSchema = z.enum(["NONE", "HIDE", "RESTORE", "SUSPEND", "UNSUSPEND"]);

export const reportCreateSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1).max(120),
  reason: reportReasonSchema,
  details: z.string().trim().max(1200).optional().nullable()
});

export const reportUpdateSchema = z.object({
  status: reportStatusSchema,
  moderatorNote: z.string().trim().max(1200).optional().nullable(),
  decisionReason: z.string().trim().max(2000).optional().nullable(),
  action: moderationActionSchema.default("NONE")
});

export const legalNoticeSchema = z.object({
  email: z.string().trim().email().max(254),
  targetUrl: z.string().trim().url().max(1000)
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), "L’URL doit utiliser HTTP ou HTTPS."),
  legalGround: z.string().trim().min(3).max(200),
  explanation: z.string().trim().min(20).max(4000),
  goodFaith: z.literal(true),
  website: z.string().max(0).optional()
});

export const appealSchema = z.object({
  trackingCode: z.string().trim().min(8).max(80),
  email: z.string().trim().email().max(254),
  reason: z.string().trim().min(20).max(3000)
});

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;
