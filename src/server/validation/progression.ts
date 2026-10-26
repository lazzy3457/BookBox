import { z } from "zod";
import { DAILY_GOAL_VALUES, isValidTimeZone } from "@/lib/progression";

export const progressSettingsSchema = z.object({
  dailyGoal: z.number().int().refine((value) => DAILY_GOAL_VALUES.includes(value as (typeof DAILY_GOAL_VALUES)[number]), "Objectif quotidien inconnu.").optional(),
  timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, "Fuseau horaire inconnu.").optional()
}).refine((input) => input.dailyGoal !== undefined || input.timezone !== undefined, "Aucune modification transmise.");
