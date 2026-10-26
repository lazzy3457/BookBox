import { describe, expect, it } from "vitest";
import {
  applyDayValidation,
  badgeBySlug,
  cappedAmount,
  displayedStreak,
  levelFromXp,
  levelProgress,
  localDay,
  nextTier,
  reachedTiers
} from "@/lib/progression";

const fresh = { currentStreak: 0, longestStreak: 0, lastValidatedDay: null, streakFreezes: 0 };

describe("cappedAmount", () => {
  it("gives full XP to uncapped actions", () => {
    expect(cappedAmount("BOOK_READ", 500)).toBe(50);
  });

  it("stops likes at the daily cap", () => {
    expect(cappedAmount("LIKE_REVIEW", 0)).toBe(1);
    expect(cappedAmount("LIKE_COMMENT", 19)).toBe(1);
    expect(cappedAmount("LIKE_REVIEW", 20)).toBe(0);
  });

  it("truncates the last action before the cap", () => {
    expect(cappedAmount("JOURNAL_ENTRY", 25)).toBe(5);
  });
});

describe("badge tiers", () => {
  const likes = badgeBySlug("coeur-genereux")!;

  it("lists every reached tier", () => {
    expect(reachedTiers(likes, 9)).toEqual([]);
    expect(reachedTiers(likes, 100)).toEqual([1, 2]);
  });

  it("points to the next threshold", () => {
    expect(nextTier(likes, 42)).toEqual({ tier: 2, threshold: 100 });
    expect(nextTier(likes, 500)).toBeNull();
  });
});

describe("applyDayValidation", () => {
  it("starts a streak on the first validated day", () => {
    expect(applyDayValidation(fresh, "2026-10-26")).toMatchObject({ currentStreak: 1, longestStreak: 1, lastValidatedDay: "2026-10-26" });
  });

  it("extends the streak on consecutive days", () => {
    const state = { currentStreak: 3, longestStreak: 3, lastValidatedDay: "2026-10-25", streakFreezes: 0 };
    expect(applyDayValidation(state, "2026-10-26")).toMatchObject({ currentStreak: 4, longestStreak: 4 });
  });

  it("does nothing when today is already validated", () => {
    const state = { currentStreak: 3, longestStreak: 5, lastValidatedDay: "2026-10-26", streakFreezes: 1 };
    expect(applyDayValidation(state, "2026-10-26")).toEqual({ ...state, frozenDays: [] });
  });

  it("spends freezes to cover missed days", () => {
    const state = { currentStreak: 8, longestStreak: 8, lastValidatedDay: "2026-10-23", streakFreezes: 2 };
    expect(applyDayValidation(state, "2026-10-26")).toMatchObject({
      currentStreak: 11,
      streakFreezes: 0,
      frozenDays: ["2026-10-24", "2026-10-25"]
    });
  });

  it("restarts when missed days exceed freezes and keeps the record", () => {
    const state = { currentStreak: 12, longestStreak: 12, lastValidatedDay: "2026-10-20", streakFreezes: 1 };
    expect(applyDayValidation(state, "2026-10-26")).toMatchObject({ currentStreak: 1, longestStreak: 12, streakFreezes: 1 });
  });

  it("earns a freeze every seven days, up to two", () => {
    const state = { currentStreak: 6, longestStreak: 6, lastValidatedDay: "2026-10-25", streakFreezes: 0 };
    expect(applyDayValidation(state, "2026-10-26").streakFreezes).toBe(1);
    expect(applyDayValidation({ ...state, streakFreezes: 2 }, "2026-10-26").streakFreezes).toBe(2);
  });

  it("handles month boundaries", () => {
    const state = { currentStreak: 2, longestStreak: 2, lastValidatedDay: "2026-10-31", streakFreezes: 0 };
    expect(applyDayValidation(state, "2026-11-01").currentStreak).toBe(3);
  });
});

describe("displayedStreak", () => {
  it("keeps the streak at risk until today is validated", () => {
    const state = { currentStreak: 4, longestStreak: 4, lastValidatedDay: "2026-10-25", streakFreezes: 0 };
    expect(displayedStreak(state, "2026-10-26")).toEqual({ streak: 4, validatedToday: false, atRisk: true });
  });

  it("drops to zero once a day is missed without freeze", () => {
    const state = { currentStreak: 4, longestStreak: 4, lastValidatedDay: "2026-10-24", streakFreezes: 0 };
    expect(displayedStreak(state, "2026-10-26").streak).toBe(0);
  });
});

describe("levels", () => {
  it("reaches level 1 at 10 XP and grows progressively", () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(9)).toBe(0);
    expect(levelFromXp(10)).toBe(1);
    expect(levelFromXp(39)).toBe(1);
    expect(levelFromXp(40)).toBe(2);
    expect(levelFromXp(1000)).toBe(10);
    expect(levelFromXp(999)).toBe(9);
  });

  it("describes progress towards the next level", () => {
    expect(levelProgress(66)).toMatchObject({ level: 2, title: "Lecteur curieux", xpIntoLevel: 26, xpForNextLevel: 50, xpToNextLevel: 24, percent: 52 });
    expect(levelProgress(0)).toMatchObject({ level: 0, title: "Nouveau lecteur", xpToNextLevel: 10 });
  });
});

describe("localDay", () => {
  it("uses the reader's time zone", () => {
    const lateEvening = new Date("2026-10-26T22:30:00.000Z");
    expect(localDay(lateEvening, "UTC")).toBe("2026-10-26");
    expect(localDay(lateEvening, "Europe/Paris")).toBe("2026-10-26");
    expect(localDay(new Date("2026-10-26T23:30:00.000Z"), "Europe/Paris")).toBe("2026-10-27");
  });
});
