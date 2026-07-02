import { z } from "zod";

export const notificationPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  likesEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  friendReviewsEnabled: z.boolean().optional(),
  followersEnabled: z.boolean().optional()
});

export const pushTokenSchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.string().trim().max(32).optional()
});
