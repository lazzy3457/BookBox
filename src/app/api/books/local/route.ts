import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { authorHref } from "@/lib/authors";

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
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { authors: { has: q } },
          { isbn13: { has: q.replace(/[^0-9X]/gi, "") } },
          { isbn10: { has: q.replace(/[^0-9X]/gi, "") } }
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

    const needle = q.toLowerCase();
    const authorCounts = new Map<string, number>();
    const authorBooks = await prisma.book.findMany({
      where: { authors: { isEmpty: false } },
      select: { authors: true },
      take: 2000
    });
    authorBooks.forEach((book) => {
      book.authors.forEach((name) => {
        if (name.toLowerCase().includes(needle)) authorCounts.set(name, (authorCounts.get(name) ?? 0) + 1);
      });
    });
    const author = [...authorCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    return NextResponse.json({
      items,
      author: author ? { name: author[0], bookCount: author[1], href: authorHref(author[0]) } : null
    });
  } catch (error) {
    return apiError(error);
  }
}
