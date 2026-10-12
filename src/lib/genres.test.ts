import { describe, expect, it } from "vitest";
import { genreLabel, genresFromCategories, normalizeGenres } from "@/lib/genres";

describe("genresFromCategories", () => {
  it("maps Google Books categories to main genres", () => {
    expect(genresFromCategories(["Fiction / Fantasy / Epic"])).toEqual(["fantasy"]);
    expect(genresFromCategories(["Fiction / Science Fiction / Space Opera"])).toEqual(["science-fiction"]);
    expect(genresFromCategories(["Juvenile Fiction / Fantasy & Magic"])).toEqual(["fantasy", "jeunesse"]);
    expect(genresFromCategories(["Fiction / Historical / General"])).toEqual(["historique"]);
    expect(genresFromCategories(["History / Europe / France"])).toEqual(["histoire"]);
  });

  it("does not confuse science-fiction with sciences", () => {
    expect(genresFromCategories(["Science fiction"])).toEqual(["science-fiction"]);
    expect(genresFromCategories(["Science / Physics / General"])).toEqual(["sciences"]);
  });

  it("ranks noisy Open Library subjects and drops anecdotal ones", () => {
    const subjects = [
      "Fiction",
      "horror fiction",
      "Fiction, thrillers, suspense",
      "Horror tales",
      "Fiction / Horror",
      "plays",
      "Military history",
      "Large type books"
    ];
    expect(genresFromCategories(subjects)).toEqual(["horreur"]);
  });

  it("keeps up to three genres when they are equally represented", () => {
    expect(genresFromCategories(["Fantasy", "Romance", "Horror", "Adventure"])).toEqual(["fantasy", "romance", "horreur"]);
  });

  it("ignores documentary genres for fiction", () => {
    expect(genresFromCategories(["Fiction", "History", "Courtship"])).toEqual(["romance"]);
    expect(genresFromCategories(["Non-Fiction", "History", "World history", "Economic history", "Science"])).toEqual(["histoire"]);
  });

  it("does not read Romance literature as the romance genre", () => {
    expect(genresFromCategories(["Fiction", "Romance literature", "Romans, nouvelles"])).toEqual([]);
  });

  it("handles French categories and accents", () => {
    expect(genresFromCategories(["Bandes dessinées", "Policier & Thriller"])).toEqual(["bd-manga", "thriller", "policier"]);
    expect(genresFromCategories(["Poésie"])).toEqual(["poesie"]);
  });

  it("ignores unknown or empty categories", () => {
    expect(genresFromCategories(["Fiction", "General"])).toEqual([]);
    expect(genresFromCategories(undefined)).toEqual([]);
  });
});

describe("normalizeGenres", () => {
  it("drops unknown values and duplicates and follows the reference order", () => {
    expect(normalizeGenres(["romance", "inconnu", "fantasy", "romance"])).toEqual(["fantasy", "romance"]);
  });

  it("returns French labels", () => {
    expect(genreLabel("science-fiction")).toBe("Science-fiction");
    expect(genreLabel("bd-manga")).toBe("BD & manga");
  });
});
