import { describe, expect, it } from "vitest";
import { groupCreateSchema, groupThreadCreateSchema } from "@/server/validation/groups";

const baseGroup = { name: "Les Fremen", topic: "FREE", visibility: "PUBLIC", emblem: "book" } as const;

describe("groupes", () => {
  it("exige un livre pour un groupe autour d'un livre", () => {
    expect(groupCreateSchema.safeParse({ ...baseGroup, topic: "BOOK" }).success).toBe(false);
    expect(groupCreateSchema.safeParse({ ...baseGroup, topic: "BOOK", bookId: "book-1" }).success).toBe(true);
  });

  it("exige une précision pour un auteur, un genre ou un défi", () => {
    expect(groupCreateSchema.safeParse({ ...baseGroup, topic: "GENRE" }).success).toBe(false);
    expect(groupCreateSchema.safeParse({ ...baseGroup, topic: "GENRE", topicLabel: "Polar" }).success).toBe(true);
  });

  it("refuse un sondage avec moins de deux réponses", () => {
    const poll = { type: "POLL", title: "Quel tome lire ?" } as const;
    expect(groupThreadCreateSchema.safeParse({ ...poll, pollOptions: ["Tome 2", " "] }).success).toBe(false);
    expect(groupThreadCreateSchema.safeParse({ ...poll, pollOptions: ["Tome 2", "Tome 3"] }).success).toBe(true);
  });
});
