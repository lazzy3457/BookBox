import { describe, expect, it } from "vitest";
import { chapterProgressSchema, reviewMutationSchema } from "@/server/validation/reviews";

describe("validation des avis", () => {
  it("accepte les demi-étoiles de 0,5 à 5", () => {
    for (const rating of [0.5, 1, 3.5, 5]) {
      expect(reviewMutationSchema.parse({ bookId: "b1", rating }).rating).toBe(rating);
    }
  });

  it("refuse les notes hors bornes ou hors demi-étoiles", () => {
    for (const rating of [0, 0.25, 3.7, 5.5]) {
      expect(reviewMutationSchema.safeParse({ bookId: "b1", rating }).success).toBe(false);
    }
  });

  it("vise le livre entier par défaut et accepte un numéro de chapitre", () => {
    expect(reviewMutationSchema.parse({ bookId: "b1", rating: 4 }).chapter).toBe(0);
    expect(reviewMutationSchema.parse({ bookId: "b1", rating: 4, chapter: 12 }).chapter).toBe(12);
    expect(reviewMutationSchema.safeParse({ bookId: "b1", rating: 4, chapter: -1 }).success).toBe(false);
    expect(reviewMutationSchema.safeParse({ bookId: "b1", rating: 4, chapter: 1.5 }).success).toBe(false);
    expect(reviewMutationSchema.safeParse({ bookId: "b1", rating: 4, chapter: 1000 }).success).toBe(false);
  });

  it("borne la progression par chapitre", () => {
    expect(chapterProgressSchema.parse({ chapter: 0 }).chapter).toBe(0);
    expect(chapterProgressSchema.safeParse({ chapter: 1000 }).success).toBe(false);
  });
});
