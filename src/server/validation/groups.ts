import { z } from "zod";

export const GROUP_EMBLEMS = ["book", "sparkles", "moon", "trophy", "search", "globe", "heart", "library"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((value) => value || null);

export const groupCreateSchema = z
  .object({
    name: z.string().trim().min(3, "Le nom doit faire au moins 3 caractères.").max(80),
    description: optionalText(600),
    topic: z.enum(["BOOK", "AUTHOR", "GENRE", "CHALLENGE", "FREE"]),
    topicLabel: optionalText(120),
    bookId: z.string().min(1).max(60).optional().nullable(),
    visibility: z.enum(["PUBLIC", "INVITE"]),
    emblem: z.enum(GROUP_EMBLEMS),
    challengeGoal: z.number().int().min(1).max(500).optional().nullable()
  })
  .refine((value) => value.topic !== "BOOK" || Boolean(value.bookId), { message: "Choisis le livre du groupe.", path: ["bookId"] })
  .refine((value) => !["AUTHOR", "GENRE", "CHALLENGE"].includes(value.topic) || Boolean(value.topicLabel), {
    message: "Précise l'auteur, le genre ou le défi du groupe.",
    path: ["topicLabel"]
  });

export const groupUpdateSchema = z.object({
  description: optionalText(600),
  rules: optionalText(1500),
  readalongBookId: z.string().min(1).max(60).optional().nullable(),
  readalongLabel: optionalText(120),
  challengeGoal: z.number().int().min(1).max(500).optional().nullable(),
  challengeEndsAt: z.string().date().optional().nullable()
});

export const groupInviteSchema = z.object({
  username: z.string().trim().min(2).max(40)
});

export const groupThreadCreateSchema = z
  .object({
    type: z.enum(["DEBATE", "POLL", "READALONG", "ANNOUNCEMENT"]),
    title: z.string().trim().min(3, "Le titre doit faire au moins 3 caractères.").max(160),
    body: optionalText(4000),
    spoilerLevel: optionalText(60),
    bookId: z.string().min(1).max(60).optional().nullable(),
    pollOptions: z.array(z.string().trim().min(1).max(100)).max(6).optional(),
    pollClosesInDays: z.number().int().min(1).max(30).optional().nullable()
  })
  .refine((value) => value.type !== "POLL" || (value.pollOptions?.filter(Boolean).length ?? 0) >= 2, {
    message: "Un sondage a besoin d'au moins deux réponses.",
    path: ["pollOptions"]
  });

export const groupThreadUpdateSchema = z.object({
  pinned: z.boolean()
});

export const groupPostCreateSchema = z.object({
  body: z.string().trim().min(1, "Ton message est vide.").max(3000),
  parentId: z.string().min(1).max(60).optional().nullable()
});

export const pollVoteSchema = z.object({
  optionId: z.string().min(1).max(60)
});
