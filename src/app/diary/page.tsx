import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getProgressSummary } from "@/server/services/progression";
import { JournalWorkspace } from "@/components/library/JournalWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon journal de lecture"
};

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
  if (!session?.user?.id) {
    return (
      <div className="bb-card mx-auto mt-6 flex max-w-xl flex-col items-start gap-3 p-6 sm:p-8">
        <h1 className="bb-h1">Mon journal de lecture</h1>
        <p className="text-sm text-muted">Connecte-toi pour retrouver ton année de lecture jour après jour.</p>
        <Link href="/login?callbackUrl=/diary" className="bb-btn-primary px-5 py-2.5 text-sm">Connexion</Link>
      </div>
    );
  }

  const userId = session.user.id;
  const currentYear = new Date().getFullYear();
  const requested = Number(params.annee);
  const year = Number.isInteger(requested) && requested > 2000 && requested <= currentYear ? requested : currentYear;
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [periods, library, progress] = await Promise.all([
    prisma.readingPeriod.findMany({
      where: {
        userBook: { userId },
        OR: [
          { entries: { some: { entryDate: { gte: start, lt: end } } } },
          { startedAt: { gte: start, lt: end } },
          { finishedAt: { gte: start, lt: end } }
        ]
      },
      include: {
        userBook: { select: { bookId: true, book: { select: { title: true, thumbnailUrl: true, pageCount: true } } } },
        entries: { orderBy: { entryDate: "asc" }, include: { likes: { select: { userId: true } } } }
      }
    }),
    prisma.userBook.findMany({
      where: { userId, status: { in: [ReadingStatus.READING, ReadingStatus.TO_READ] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        status: true,
        bookId: true,
        book: { select: { title: true, thumbnailUrl: true, pageCount: true } },
        readingPeriods: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, entries: { where: { page: { not: null }, kind: "NOTE" }, orderBy: { entryDate: "desc" }, take: 1, select: { page: true } } } }
      }
    }),
    getProgressSummary(userId)
  ]);

  const ratings = new Map(
    (await prisma.review.findMany({ where: { userId, bookId: { in: periods.map((period) => period.userBook.bookId) } }, select: { bookId: true, rating: true } })).map((review) => [review.bookId, review.rating])
  );

  return (
    <JournalWorkspace
      key={year}
      year={year}
      isCurrentYear={year === currentYear}
      streak={progress.streak}
      periods={periods.map((period) => ({
        id: period.id,
        bookId: period.userBook.bookId,
        title: period.userBook.book.title,
        thumbnailUrl: period.userBook.book.thumbnailUrl,
        pageCount: period.userBook.book.pageCount,
        startedAt: period.startedAt?.toISOString() ?? null,
        finishedAt: period.finishedAt?.toISOString() ?? null,
        isReread: period.isReread,
        rating: ratings.get(period.userBook.bookId) ?? null,
        entries: period.entries.map((entry) => ({
          id: entry.id,
          entryDate: entry.entryDate.toISOString(),
          page: entry.page,
          percentage: entry.percentage,
          chapter: entry.chapter,
          note: entry.note,
          kind: entry.kind,
          isPublic: entry.isPublic,
          likes: entry.likes.length,
          likedByMe: entry.likes.some((like) => like.userId === userId)
        }))
      }))}
      books={library.map((entry) => ({
        bookId: entry.bookId,
        title: entry.book.title,
        thumbnailUrl: entry.book.thumbnailUrl,
        pageCount: entry.book.pageCount,
        status: entry.status,
        periodId: entry.readingPeriods[0]?.id ?? null,
        lastPage: entry.readingPeriods[0]?.entries[0]?.page ?? null
      }))}
    />
  );
}
