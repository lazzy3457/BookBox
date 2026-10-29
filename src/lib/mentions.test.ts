import { describe, expect, it } from "vitest";
import { extractMentions } from "@/lib/mentions";

describe("mentions", () => {
  it("repère les pseudos mentionnés, sans doublon", () => {
    expect(extractMentions("Merci @Camille et @theo_42, @camille avait raison")).toEqual(["camille", "theo_42"]);
  });

  it("ignore les adresses e-mail et les pseudos trop courts", () => {
    expect(extractMentions("écris à lea@exemple.fr ou @ab")).toEqual([]);
  });

  it("accepte un texte vide", () => {
    expect(extractMentions(null)).toEqual([]);
  });
});
