import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";

const SHOWCASE_SIZE = 4;

const showcaseSchema = z.object({
  bookIds: z.array(z.string().min(1).max(60)).max(SHOWCASE_SIZE, `Choisis au plus ${SHOWCASE_SIZE} livres.`)
});

// Vitrine du profil : les coups de cœur choisis, dans l'ordre voulu. Les autres restent des coups de cœur.
export async function PUT(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const { bookIds } = showcaseSchema.parse(await request.json());
    const favorites = await prisma.userBook.findMany({ where: { userId, isFavorite: true, bookId: { in: bookIds } }, select: { bookId: true } });
    const allowed = new Set(favorites.map((entry) => entry.bookId));
    const ordered = bookIds.filter((bookId, index) => allowed.has(bookId) && bookIds.indexOf(bookId) === index);

    await prisma.$transaction([
      prisma.userBook.updateMany({ where: { userId, showcaseRank: { not: null } }, data: { showcaseRank: null } }),
      ...ordered.map((bookId, index) => prisma.userBook.update({ where: { userId_bookId: { userId, bookId } }, data: { showcaseRank: index + 1 } }))
    ]);
    return NextResponse.json({ bookIds: ordered });
  } catch (error) {
    return apiError(error);
  }
}
