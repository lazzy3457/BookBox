import { describe, expect, it } from "vitest";
import { isReleased, monthHeading, normalizeLooseDate, parseReleaseDate } from "@/lib/releaseDates";

describe("parseReleaseDate", () => {
  it("accepte les dates au jour et au mois", () => {
    expect(parseReleaseDate("2026-10-15")).toEqual({ iso: "2026-10-15", year: 2026, month: 10, day: 15 });
    expect(parseReleaseDate("2026-10")).toEqual({ iso: "2026-10", year: 2026, month: 10, day: null });
    expect(parseReleaseDate("2026-10-15T00:00:00Z")?.iso).toBe("2026-10-15");
  });

  it("rejette les dates trop vagues ou invalides", () => {
    expect(parseReleaseDate("2026")).toBeNull();
    expect(parseReleaseDate("2026-13-01")).toBeNull();
    expect(parseReleaseDate("2026-02-30")).toBeNull();
    expect(parseReleaseDate(null)).toBeNull();
  });
});

describe("normalizeLooseDate", () => {
  it("comprend les formats Open Library en anglais et en français", () => {
    expect(normalizeLooseDate("2026-02-17")).toBe("2026-02-17");
    expect(normalizeLooseDate("February 17, 2026")).toBe("2026-02-17");
    expect(normalizeLooseDate("16th June 2026")).toBe("2026-06-16");
    expect(normalizeLooseDate("12 janvier 2026")).toBe("2026-01-12");
    expect(normalizeLooseDate("1er août 2026")).toBe("2026-08-01");
    expect(normalizeLooseDate("Janvier 2026")).toBe("2026-01");
  });

  it("ignore les formats ambigus ou trop vagues", () => {
    expect(normalizeLooseDate("10/04/2026")).toBeNull();
    expect(normalizeLooseDate("2026")).toBeNull();
    expect(normalizeLooseDate("Printemps 2026")).toBeNull();
  });
});

describe("isReleased", () => {
  it("compare au jour près, et au mois pour les dates sans jour", () => {
    expect(isReleased(parseReleaseDate("2026-10-12")!, "2026-10-12")).toBe(true);
    expect(isReleased(parseReleaseDate("2026-10-13")!, "2026-10-12")).toBe(false);
    expect(isReleased(parseReleaseDate("2026-10")!, "2026-10-12")).toBe(false);
    expect(isReleased(parseReleaseDate("2026-09")!, "2026-10-12")).toBe(true);
  });
});

describe("monthHeading", () => {
  it("formate le mois en français", () => {
    expect(monthHeading(2026, 8)).toBe("Août 2026");
  });
});
