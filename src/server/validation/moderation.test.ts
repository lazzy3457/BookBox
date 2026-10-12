import { describe, expect, it } from "vitest";
import { legalNoticeSchema, reportCreateSchema, reportUpdateSchema } from "@/server/validation/moderation";

describe("moderation validation", () => {
  it("accepts a normalized report", () => {
    expect(reportCreateSchema.parse({
      targetType: "REVIEW",
      targetId: "review-id",
      reason: "SPOILER",
      details: "Spoiler visible dès la première ligne."
    }).reason).toBe("SPOILER");
  });

  it("rejects unknown reasons and oversized details", () => {
    expect(() => reportCreateSchema.parse({
      targetType: "USER",
      targetId: "user-id",
      reason: "UNKNOWN",
      details: "x".repeat(1201)
    })).toThrow();
  });

  it("accepts only known moderation statuses", () => {
    expect(() => reportUpdateSchema.parse({ status: "DELETED" })).toThrow();
  });

  it("requires a good-faith, precise legal notice", () => {
    expect(legalNoticeSchema.parse({
      email: "reader@example.com",
      targetUrl: "https://booksbox.example/books/1",
      legalGround: "Atteinte à la vie privée",
      explanation: "Ce contenu révèle publiquement une information personnelle précise.",
      goodFaith: true,
      website: ""
    }).goodFaith).toBe(true);
    expect(() => legalNoticeSchema.parse({
      email: "reader@example.com",
      targetUrl: "https://booksbox.example/books/1",
      legalGround: "Autre",
      explanation: "Trop court",
      goodFaith: false
    })).toThrow();
  });
});
