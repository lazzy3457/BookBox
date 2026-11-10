import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { publicUserSelect } from "@/server/db/selects";
import { WHOLE_BOOK } from "@/lib/chapters";

/** Où en est le lecteur : son chapitre déclaré, et s'il a terminé le livre (tout lui est alors ouvert). */
export async function getReaderChapter(userId: string | null | undefined, bookId: string) {
  if (!userId) return { chapter: 0, finished: false };
  const [progress, userBook] = await Promise.all([
    prisma.chapterProgress.findUnique({ where: { userId_bookId: { userId, bookId } }, select: { chapter: true } }),
    prisma.userBook.findUnique({ where: { userId_bookId: { userId, bookId } }, select: { status: true } })
  ]);
  return { chapter: progress?.chapter ?? 0, finished: userBook?.status === ReadingStatus.READ };
}

export async function setChapterProgress(userId: string, bookId: string, chapter: number) {
  return prisma.chapterProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, chapter },
    update: { chapter }
  });
}

/** Avance la progression sans jamais la faire reculer (publier un avis sur le chapitre 7 = l'avoir atteint). */
export async function advanceChapterProgress(userId: string, bookId: string, chapter: number) {
  const current = await prisma.chapterProgress.findUnique({ where: { userId_bookId: { userId, bookId } }, select: { chapter: true } });
  if (current && current.chapter >= chapter) return;
  await setChapterProgress(userId, bookId, chapter);
}

/** Chapitres qui ont des avis visibles, sans aucun texte : nombre d'avis, moyenne, dernière activité. */
export async function getChapterSummaries(bookId: string, blockedUserIds: string[] = []) {
  const rows = await prisma.review.groupBy({
    by: ["chapter"],
    where: {
      bookId,
      chapter: { gt: WHOLE_BOOK },
      hiddenAt: null,
      user: { suspendedAt: null },
      ...(blockedUserIds.length ? { userId: { notIn: blockedUserIds } } : {})
    },
    _count: { _all: true },
    _avg: { rating: true },
    _max: { createdAt: true },
    orderBy: { chapter: "asc" }
  });
  return rows.map((row) => ({ chapter: row.chapter, reviews: row._count._all, averageRating: row._avg.rating, lastReviewAt: row._max.createdAt }));
}

export async function getChapterReviews(bookId: string, chapter: number, blockedUserIds: string[] = []) {
  return prisma.review.findMany({
    where: {
      bookId,
      chapter,
      hiddenAt: null,
      user: { suspendedAt: null },
      ...(blockedUserIds.length ? { userId: { notIn: blockedUserIds } } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: publicUserSelect },
      reactions: true,
      comments: {
        where: { hiddenAt: null, user: { suspendedAt: null } },
        include: { user: { select: publicUserSelect }, likes: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}
