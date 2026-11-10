import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { slugifyAuthor } from "@/lib/authors";

// Un slug peut couvrir plusieurs graphies du même auteur (« J.K. Rowling », « J. K. Rowling »).
async function loadAuthorNamesBySlug() {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT DISTINCT unnest("authors") AS "name" FROM "Book"`;
  const bySlug: Record<string, string[]> = {};
  rows.forEach(({ name }) => {
    (bySlug[slugifyAuthor(name)] ??= []).push(name);
  });
  return bySlug;
}

const cachedAuthorNamesBySlug = unstable_cache(loadAuthorNamesBySlug, ["author-names-by-slug"], { revalidate: 600 });

// Graphies connues d'un auteur. La table est gardée 10 minutes ; un auteur tout juste ajouté
// n'y est pas encore, d'où la relecture directe quand le slug est absent.
export async function findAuthorNames(authorSlug: string) {
  const cached = (await cachedAuthorNamesBySlug())[authorSlug];
  if (cached?.length) return cached;
  return (await loadAuthorNamesBySlug())[authorSlug] ?? [];
}
