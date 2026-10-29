import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { LibraryWorkspace } from "@/components/library/LibraryWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ma bibliothèque"
};

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="bb-card mx-auto mt-6 flex max-w-xl flex-col items-start gap-3 p-6 sm:p-8">
        <h1 className="bb-h1">Ma bibliothèque</h1>
        <p className="text-sm text-muted">Connecte-toi pour retrouver tes lectures, tes livres à lire et tes coups de cœur.</p>
        <Link href="/login?callbackUrl=/library" className="bb-btn-primary px-5 py-2.5 text-sm">Connexion</Link>
      </div>
    );
  }

  const userId = session.user.id;
  const [items, reviews, lists] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId },
      include: {
        book: true,
        readingPeriods: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { entries: { where: { kind: "NOTE" }, orderBy: { entryDate: "desc" }, take: 1 } }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.review.findMany({ where: { userId }, select: { bookId: true, rating: true } }),
    prisma.bookList.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { entries: true } },
        entries: { take: 4, orderBy: { order: "asc" }, include: { book: { select: { title: true, thumbnailUrl: true } } } }
      }
    })
  ]);

  const ratings = new Map(reviews.map((review) => [review.bookId, review.rating]));
  const year = new Date().getFullYear();
  const readItems = items.filter((item) => item.status === ReadingStatus.READ);
  const finishedAt = (item: (typeof items)[number]) => item.readingPeriods[0]?.finishedAt ?? item.updatedAt;
  const readThisYear = readItems.filter((item) => finishedAt(item).getFullYear() === year).length;
  const pagesRead = readItems.reduce((total, item) => total + (item.book.pageCount ?? 0), 0);
  const averageRating = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : null;

  return (
    <LibraryWorkspace
      year={year}
      stats={{
        readThisYear,
        pagesRead,
        reading: items.filter((item) => item.status === ReadingStatus.READING).length,
        averageRating
      }}
      lists={lists.map((list) => ({
        id: list.id,
        title: list.title,
        isPublic: list.isPublic,
        count: list._count.entries,
        covers: list.entries.map((entry) => ({ title: entry.book.title, thumbnailUrl: entry.book.thumbnailUrl }))
      }))}
      items={items.map((item) => {
        const period = item.readingPeriods[0];
        const entry = period?.entries[0];
        return {
          id: item.id,
          status: item.status,
          isFavorite: item.isFavorite,
          addedAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          rating: ratings.get(item.bookId) ?? null,
          reading: period
            ? {
                periodId: period.id,
                startedAt: period.startedAt?.toISOString() ?? null,
                finishedAt: period.finishedAt?.toISOString() ?? null,
                page: entry?.page ?? null,
                percentage: entry?.percentage ?? null
              }
            : null,
          book: {
            id: item.book.id,
            title: item.book.title,
            authors: item.book.authors,
            thumbnailUrl: item.book.thumbnailUrl,
            pageCount: item.book.pageCount,
            genres: item.book.genres
          }
        };
      })}
    />
  );
}
