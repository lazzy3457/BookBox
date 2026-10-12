import { describe, expect, it } from "vitest";
import { ReadingStatus } from "@prisma/client";
import { parseLibraryImport } from "@/server/services/libraryImport";

describe("parseLibraryImport", () => {
  it("parses a Goodreads export with quoted accents and dates", () => {
    const csv = [
      "Book Id,Title,Author,ISBN13,My Rating,Exclusive Shelf,Date Read,Date Added,My Review",
      '42,"L’Étranger","Camus, Albert","=""9782070360024""",5,read,2026/06/12,2026/05/30,"Très bon, vraiment"'
    ].join("\n");

    const [row] = parseLibraryImport(csv);

    expect(row.title).toBe("L’Étranger");
    expect(row.authors).toEqual(["Camus, Albert"]);
    expect(row.isbn13).toEqual(["9782070360024"]);
    expect(row.status).toBe(ReadingStatus.READ);
    expect(row.rating).toBe(5);
    expect(row.finishedAt).toBe("2026-06-12");
    expect(row.addedAt).toBe("2026-05-30");
    expect(row.review).toBe("Très bon, vraiment");
  });

  it("parses the native BookBox format and keeps invalid rows for preview", () => {
    const csv = [
      "title,authors,isbn13,isbn10,status,rating,startedAt,finishedAt,addedAt,review",
      "Dune,Frank Herbert,9780441172719,,READING,4,2026-07-01,,2026-06-15,Lecture en cours",
      ",Auteur,,,,,,,,,"
    ].join("\n");

    const rows = parseLibraryImport(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      status: ReadingStatus.READING,
      startedAt: "2026-07-01",
      addedAt: "2026-06-15"
    });
    expect(rows[1].title).toBe("");
  });

  it("supports escaped quotes and commas", () => {
    const [row] = parseLibraryImport('title,authors,status\n"Un ""drôle"", livre","Nom, Prénom",TO_READ');
    expect(row.title).toBe('Un "drôle", livre');
  });
});
