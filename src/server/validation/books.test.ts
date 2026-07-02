import { describe, expect, it } from "vitest";
import { manualBookSchema } from "@/server/validation/books";

describe("book validation", () => {
  it("accepts a regular HTTPS cover", () => {
    expect(manualBookSchema.parse({
      title: "Dune",
      authors: ["Frank Herbert"],
      thumbnailUrl: "https://example.test/dune.jpg"
    }).title).toBe("Dune");
  });

  it("rejects non-web cover protocols", () => {
    expect(() => manualBookSchema.parse({
      title: "Dune",
      authors: ["Frank Herbert"],
      thumbnailUrl: "javascript:alert(1)"
    })).toThrow();
  });
});
