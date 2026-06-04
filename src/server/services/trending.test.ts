import { describe, expect, it } from "vitest";

function scoreBook(input: { read: number; toRead: number; reviews: number; reactions: number }) {
  return input.read * 3 + input.toRead * 2 + input.reviews * 4 + input.reactions;
}

describe("trending score", () => {
  it("weights reviews and read activity more than to-read saves", () => {
    expect(scoreBook({ read: 1, toRead: 1, reviews: 1, reactions: 2 })).toBe(11);
  });
});
