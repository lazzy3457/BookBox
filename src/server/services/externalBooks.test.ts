import { describe, expect, it } from "vitest";
import { excludeMangaSeries, isManga, mangaSeriesKey, mergeSourcePages, normalizeLanguageCode, sanitizeExternalBook } from "@/server/services/externalBooks";
import type { ExternalBookCandidate, SourcePage } from "@/server/services/externalBooks";
import { normalizeGoogleBook } from "@/server/services/googleBooks";
import { normalizeOpenLibraryBook } from "@/server/services/openLibrary";
import { externalBookUpsertSchema } from "@/server/validation/books";

function page(prefix: string, positions: number[], nextStartIndex: number, hasMore = true): SourcePage {
  return {
    items: positions.map((position): ExternalBookCandidate => ({ title: `${prefix}${position}`, authors: [], openLibraryKey: `${prefix}${position}` })),
    positions,
    nextStartIndex,
    hasMore
  };
}

describe("sanitizeExternalBook", () => {
  it("coupe les champs trop longs au lieu de rejeter le livre", () => {
    const book = sanitizeExternalBook({
      title: "T".repeat(400),
      authors: ["A".repeat(300), " ", "Bob"],
      publisher: "P".repeat(400),
      description: "D".repeat(20_000),
      pageCount: 0,
      language: "fre",
      isbn13: Array.from({ length: 60 }, (_, index) => `97800000${String(index).padStart(5, "0")}`)
    });

    expect(book.title).toHaveLength(180);
    expect(book.authors).toEqual(["A".repeat(120), "Bob"]);
    expect(book.publisher).toHaveLength(180);
    expect(book.description).toHaveLength(10_000);
    expect(book.pageCount).toBeUndefined();
    expect(book.language).toBe("fr");
    expect(book.isbn13).toHaveLength(20);
    expect(externalBookUpsertSchema.safeParse({ ...book, source: "open_library" }).success).toBe(true);
  });
});

describe("normalizeLanguageCode", () => {
  it("convertit les codes sur 3 lettres", () => {
    expect(["fre", "eng", "spa", "ita", "ger", "FR"].map(normalizeLanguageCode)).toEqual(["fr", "en", "es", "it", "de", "fr"]);
    expect(normalizeLanguageCode(undefined)).toBeUndefined();
  });
});

describe("isManga", () => {
  it("reconnaît un manga par ses catégories ou ses sujets", () => {
    expect(isManga({ categories: ["Comics & Graphic Novels / Manga / Fantasy"] })).toBe(true);
    expect(isManga({ categories: ["Comic books, strips", "nyt:manga=2012-09-30"] })).toBe(true);
  });

  it("reconnaît un manga par son éditeur quand Google ne donne que la catégorie générique", () => {
    expect(isManga({ categories: ["Comics & Graphic Novels"], publisher: "Kana" })).toBe(true);
    expect(isManga({ categories: ["Comics & Graphic Novels"], publisher: "VIZ Media LLC" })).toBe(true);
    expect(isManga({ categories: ["Comics & Graphic Novels"], publisher: "Glénat Manga" })).toBe(true);
    expect(isManga({ publisher: "Viz Media" })).toBe(true);
  });

  it("garde les BD et les comics occidentaux", () => {
    expect(isManga({ categories: ["Comics & Graphic Novels"], publisher: "Hachette Asterix" })).toBe(false);
    expect(isManga({ categories: ["Comics & Graphic Novels"], publisher: "Glénat" })).toBe(false);
    expect(isManga({ categories: ["Bandes dessinées"], publisher: "Dargaud" })).toBe(false);
    // Éditeur de mangas, mais livre hors BD : on ne l'écarte pas.
    expect(isManga({ categories: ["Fiction"], publisher: "Pika" })).toBe(false);
    expect(isManga({})).toBe(false);
  });
});

describe("excludeMangaSeries", () => {
  it("réduit un titre de tome au nom de sa série", () => {
    expect(["Naruto, Vol. 25", "Naruto t.33", "NARUTO -ナルト- 巻ノ十", "Naruto 01"].map(mangaSeriesKey)).toEqual(["naruto", "naruto", "naruto", "naruto"]);
    expect(mangaSeriesKey("Ubu")).toBeNull();
  });

  it("écarte les autres BD de la série, en gardant les positions", () => {
    const page = {
      items: [
        { title: "Naruto nº 26/72", authors: [], genres: ["bd-manga"] },
        { title: "Naruto Livre de Coloriage", authors: [], genres: [] },
        { title: "Astérix le Gaulois", authors: [], genres: ["bd-manga"] }
      ],
      positions: [3, 5, 8]
    };
    const filtered = excludeMangaSeries(page, new Set(["naruto"]));
    expect(filtered.items.map((book) => book.title)).toEqual(["Naruto Livre de Coloriage", "Astérix le Gaulois"]);
    expect(filtered.positions).toEqual([5, 8]);
  });
});

describe("normalizeGoogleBook", () => {
  it("accepte pageCount: 0 et un titre trop long", () => {
    const book = normalizeGoogleBook({ id: "abc", volumeInfo: { title: "T".repeat(300), pageCount: 0, authors: ["Auteur"] } });
    expect(book?.title).toHaveLength(180);
    expect(book?.pageCount).toBeUndefined();
  });

  it("renvoie null pour un volume inutilisable, sans lever d'erreur", () => {
    expect(normalizeGoogleBook({ id: "" })).toBeNull();
  });
});

describe("normalizeOpenLibraryBook", () => {
  const work = {
    key: "/works/OL257943W",
    title: "A Game of Thrones",
    author_name: ["George R. R. Martin"],
    cover_i: 1,
    first_publish_year: 1996
  };

  it("décrit une seule édition cohérente", () => {
    const book = normalizeOpenLibraryBook({
      ...work,
      editions: {
        docs: [{
          key: "/books/OL43033560M",
          title: "Le Trône de fer",
          publisher: ["Pygmalion"],
          language: ["fre"],
          publish_date: ["11 Janvier 2008"],
          isbn: ["9782756402109", "2756402109", "9780000000001", "9780000000002", "9780000000003"],
          cover_i: 2
        }]
      }
    });

    expect(book).toMatchObject({
      openLibraryKey: "OL43033560M",
      title: "Le Trône de fer",
      publisher: "Pygmalion",
      language: "fr",
      publishedDate: "2008",
      isbn10: ["2756402109"]
    });
    expect(book?.isbn13).toHaveLength(2);
    expect(book?.thumbnailUrl).toContain("/id/2-L.jpg");
  });

  it("ne garde que les données sûres quand aucune édition n'est fournie", () => {
    const book = normalizeOpenLibraryBook(work);
    expect(book).toMatchObject({ openLibraryKey: "/works/OL257943W", title: "A Game of Thrones", publishedDate: "1996", isbn10: [], isbn13: [] });
    expect(book?.publisher).toBeUndefined();
    expect(book?.language).toBeUndefined();
  });
});

describe("externalBookUpsertSchema", () => {
  it("coupe une liste d'ISBN trop longue au lieu de renvoyer une erreur", () => {
    const parsed = externalBookUpsertSchema.parse({
      source: "open_library",
      openLibraryKey: "OL1M",
      title: "Livre",
      isbn13: [...Array.from({ length: 100 }, (_, index) => `97800000${String(index).padStart(5, "0")}`), "pas-un-isbn"]
    });
    expect(parsed.isbn13).toHaveLength(20);
    expect(parsed.isbn10).toEqual([]);
  });
});

describe("mergeSourcePages", () => {
  it("reprend chaque source juste après son dernier livre affiché", () => {
    // Google a écarté les index 1 et 3 (manga, volume invalide).
    const google = page("g", [0, 2, 4, 5], 6);
    const openLibrary = page("o", [0, 1, 2, 3], 4);
    const first = mergeSourcePages(google, openLibrary, 4);

    expect(first.items.map((book) => book.title)).toEqual(["g0", "o0", "g2", "o1"]);
    expect(first).toMatchObject({ firstStart: 4, secondStart: 2, hasMore: true });
  });

  it("vide une source quand l'autre est épuisée et avance au-delà des livres écartés", () => {
    const merged = mergeSourcePages(page("g", [0], 5, false), page("o", [0, 1, 2], 3, false), 10);
    expect(merged.items.map((book) => book.title)).toEqual(["g0", "o0", "o1", "o2"]);
    expect(merged).toMatchObject({ firstStart: 5, secondStart: 3, hasMore: false });
  });

  it("ne répète pas un livre déjà vu", () => {
    const seen = new Set<string>();
    mergeSourcePages(page("g", [0, 1], 2), page("o", [], 0, false), 2, seen);
    const next = mergeSourcePages(page("g", [1, 2], 3), page("o", [], 0, false), 2, seen);
    expect(next.items.map((book) => book.title)).toEqual(["g2"]);
  });
});
