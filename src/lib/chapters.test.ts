import { describe, expect, it } from "vitest";
import { isChapterUnlocked, parseChapter, reviewHref } from "@/lib/chapters";

describe("chapitres", () => {
  it("n'accepte que des numéros de chapitre entiers entre 1 et 999", () => {
    expect(parseChapter("1")).toBe(1);
    expect(parseChapter("999")).toBe(999);
    expect(parseChapter("0")).toBeNull();
    expect(parseChapter("1000")).toBeNull();
    expect(parseChapter("3.5")).toBeNull();
    expect(parseChapter("abc")).toBeNull();
    expect(parseChapter("")).toBeNull();
  });

  it("n'ouvre que les chapitres déjà atteints, ou tous une fois le livre terminé", () => {
    expect(isChapterUnlocked(3, { finished: false, chapter: 3 })).toBe(true);
    expect(isChapterUnlocked(4, { finished: false, chapter: 3 })).toBe(false);
    expect(isChapterUnlocked(1, { finished: false, chapter: 0 })).toBe(false);
    expect(isChapterUnlocked(40, { finished: true, chapter: 0 })).toBe(true);
  });

  it("renvoie un avis de chapitre vers la page de son chapitre", () => {
    expect(reviewHref({ bookId: "b1", chapter: 0 })).toBe("/books/b1");
    expect(reviewHref({ bookId: "b1", chapter: 7 })).toBe("/books/b1/chapitres/7");
  });
});
