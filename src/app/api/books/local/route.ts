import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { authorHref } from "@/lib/authors";
import { toIsbn13 } from "@/lib/catalog";

const localSearchSchema = z.object({
  q: z.string().trim().min(2, "Recherche trop courte.").max(120)
});

// Recherche instantanée dans les livres déjà présents sur BooksBox (affichés avant les sources externes).
export async function GET(request: Request) {
  try {
    await enforceRateLimit({
      scope: "book-local-search",
      identifier: getClientIdentifier(request),
      limit: 120,
      windowMs: 60_000
    });
    const { q } = localSearchSchema.parse({ q: new URL(request.url).searchParams.get("q") ?? "" });
    const isbn = toIsbn13(q);
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { authors: { has: q } },
          ...(isbn ? [{ editions: { some: { isbn13: isbn } } }] : [])
        ]
      },
      take: 30,
      select: {
        id: true,
        title: true,
        authors: true,
        thumbnailUrl: true,
        publishedDate: true,
        genres: true,
        _count: { select: { libraries: { where: { user: { suspendedAt: null } } } } }
      }
    });

    const items = books
      .map((book) => ({
        id: book.id,
        title: book.title,
        authors: book.authors,
        thumbnailUrl: book.thumbnailUrl,
        publishedDate: book.publishedDate,
        genres: book.genres,
        readers: book._count.libraries
      }))
      .sort((a, b) => b.readers - a.readers)
      .slice(0, 5);

    // L'auteur le plus présent parmi ceux dont le nom contient la recherche, compté en base.
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const [author] = await prisma.$queryRaw<Array<{ name: string; bookCount: number }>>`
      SELECT a."name", COUNT(*)::int AS "bookCount"
      FROM "Book" b, unnest(b."authors") AS a("name")
      WHERE a."name" ILIKE ${pattern}
      GROUP BY a."name"
      ORDER BY COUNT(*) DESC, a."name" ASC
      LIMIT 1
    `;

    return NextResponse.json({
      items,
      author: author ? { name: author.name, bookCount: author.bookCount, href: authorHref(author.name) } : null
    });
  } catch (error) {
    return apiError(error);
  }
}
