import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publicUserSelect } from "@/server/db/selects";

// Relations Prisma qui pointent vers User : les inclure avec `true` renvoie toute la ligne du compte.
const USER_RELATIONS = /\b(user|author|actor|recipient|reporter|createdBy|invitedBy|moderator|follower): true\b/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });
}

describe("données de compte exposées", () => {
  it("ne garde que des champs publics dans publicUserSelect", () => {
    expect(Object.keys(publicUserSelect).sort()).toEqual(["id", "image", "name", "username"]);
  });

  it("n'inclut jamais une ligne User entière dans une requête", () => {
    const offenders = sourceFiles("src").filter((path) => USER_RELATIONS.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });
});
