import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LibraryShelf } from "@/components/library/LibraryShelf";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="min-w-0 overflow-hidden rounded border border-line bg-panel p-5 sm:p-8">
        <h1 className="text-2xl font-black text-paper">Bibliothèque privée</h1>
        <p className="mt-3 text-muted">Connecte-toi pour gérer tes lectures.</p>
        <Link href="/login" className="mt-5 inline-block rounded bg-mint px-5 py-3 font-black text-ink">
          Connexion
        </Link>
      </div>
    );
  }

  const items = await prisma.userBook.findMany({
    where: { userId: session.user.id },
    include: {
      book: true,
      readingPeriods: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { entries: { orderBy: { entryDate: "desc" }, take: 1 } }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="min-w-0 overflow-hidden">
      <SectionHeader
        eyebrow="Personnel"
        title="Bibliothèque"
        description="Une vue etagere avec filtres et tris bases sur les donnees Google Books : titre, auteur, publication, pages et statut."
      />
      {items.length ? (
        <LibraryShelf
          items={items.map((item) => ({
            id: item.id,
            status: item.status,
            updatedAt: item.updatedAt.toISOString(),
            latestReading: item.readingPeriods[0] ? {
              startedAt: item.readingPeriods[0].startedAt?.toISOString() ?? null,
              finishedAt: item.readingPeriods[0].finishedAt?.toISOString() ?? null,
              isReread: item.readingPeriods[0].isReread,
              page: item.readingPeriods[0].entries[0]?.page ?? null,
              percentage: item.readingPeriods[0].entries[0]?.percentage ?? null,
              chapter: item.readingPeriods[0].entries[0]?.chapter ?? null
            } : null,
            book: {
              id: item.book.id,
              title: item.book.title,
              authors: item.book.authors,
              thumbnailUrl: item.book.thumbnailUrl,
              publishedDate: item.book.publishedDate,
              publisher: item.book.publisher,
              pageCount: item.book.pageCount,
              language: item.book.language,
              source: item.book.source
            }
          }))}
        />
      ) : (
        <div className="rounded border border-line bg-panel/65 p-5 text-sm text-muted sm:p-8">
          Ta bibliotheque est vide. Lance une recherche pour ajouter ton premier livre.
        </div>
      )}
    </div>
  );
}
