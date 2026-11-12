import { prisma } from "@/server/db/prisma";

// Graphies connues d'un auteur, la principale en premier. Un slug peut en couvrir
// plusieurs (« J.K. Rowling », « J. K. Rowling ») : elles sont gardées en alias.
export async function findAuthorNames(authorSlug: string) {
  const author = await prisma.author.findUnique({ where: { slug: authorSlug }, select: { name: true, aliases: true } });
  return author ? [author.name, ...author.aliases] : [];
}
