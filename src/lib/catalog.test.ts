import { describe, expect, it } from "vitest";
import { bookMatchKey, candidateIsbns, openLibraryKeys, toIsbn13 } from "@/lib/catalog";

describe("bookMatchKey", () => {
  it("rapproche deux graphies du même titre et du même premier auteur", () => {
    expect(bookMatchKey("Le Trône de fer", ["George R. R. Martin"])).toBe("le trone de fer|george r r martin");
    expect(bookMatchKey("LE TRONE DE FER ", ["George R.R. Martin", "Jean Sola"])).toBe(bookMatchKey("Le Trône de fer", ["George R. R. Martin"]));
  });

  it("distingue les tomes et refuse un titre sans auteur", () => {
    expect(bookMatchKey("Dune - Tome 2", ["Frank Herbert"])).not.toBe(bookMatchKey("Dune - Tome 1", ["Frank Herbert"]));
    expect(bookMatchKey("Dune", [])).toBeNull();
  });
});

describe("toIsbn13", () => {
  it("garde un ISBN-13 et convertit un ISBN-10", () => {
    expect(toIsbn13("978-2-07-061275-8")).toBe("9782070612758");
    expect(toIsbn13("2070612759")).toBe("9782070612758");
    expect(toIsbn13("080442957X")).toBe("9780804429573");
  });

  it("refuse une valeur mal formée", () => {
    expect(toIsbn13("12345")).toBeNull();
    expect(toIsbn13("1234567890123")).toBeNull();
  });
});

describe("candidateIsbns", () => {
  it("ne compte qu'une fois l'ISBN-10 et l'ISBN-13 d'une même édition", () => {
    expect(candidateIsbns(["9782070612758"], ["2070612759"])).toEqual(["9782070612758"]);
  });
});

describe("openLibraryKeys", () => {
  it("sépare la clé d'édition de la clé d'œuvre", () => {
    expect(openLibraryKeys("OL43033560M", "/works/OL257943W")).toEqual({ editionKey: "OL43033560M", workKey: "OL257943W" });
    expect(openLibraryKeys("/works/OL257943W")).toEqual({ editionKey: undefined, workKey: "OL257943W" });
    expect(openLibraryKeys(undefined)).toEqual({ editionKey: undefined, workKey: undefined });
  });
});
