import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { BookOpen, Globe, Lock, Star } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ListReviews } from "@/components/lists/ListReviews";

export const dynamic = "force-dynamic";

export default async function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const session = await getServerSession(authOptions);

  const list = await prisma.bookList.findUnique({
    where: { id: listId },
    include: {
      user: true,
      entries: {
        orderBy: { order: "asc" },
        include: {
          book: {
            include: {
              reviews: {
                include: {
                  user: true,
                  reactions: true,
                  comments: {
                    include: { user: true },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      _count: { select: { entries: true } },
    },
  });

  if (!list) notFound();
  if (!list.isPublic && list.userId !== session?.user?.id) notFound();

  const isOwner = session?.user?.id === list.userId;

  // Flatten toutes les reviews des livres de la liste
  const reviews = list.entries.flatMap((entry) =>
    entry.book.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      spoiler: review.spoiler,
      userId: review.userId,
      userName: review.user.name ?? "Lecteur BooksBox",
      userImage: review.user.image,
      reactionsCount: review.reactions.length,
      bookTitle: entry.book.title,
      bookId: entry.bookId,
      comments: review.comments.map((c) => ({
        id: c.id,
        body: c.body,
        userName: c.user.name ?? "Lecteur BooksBox",
        createdAt: c.createdAt.toISOString(),
      })),
    }))
  );

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-coral" />

        <div className="relative h-36 overflow-hidden">
          <div className="flex h-full">
            {list.entries.slice(0, 8).map((entry, i) => (
              <div key={entry.id} className="relative h-full flex-1 overflow-hidden" style={{ opacity: 1 - i * 0.08 }}>
                {entry.book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slateCard to-ink" />
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/60 to-transparent" />
        </div>

        <div className="px-7 pb-7 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-mint">
                <span>Liste</span>
                {list.isPublic ? <Globe size={12} /> : <Lock size={12} />}
              </div>
              <h1 className="mt-2 text-4xl font-black text-paper">{list.title}</h1>
              <p className="mt-2 text-sm text-muted">
                Par{" "}
                <Link href="/profile" className="font-bold text-paper hover:text-mint transition">
                  {list.user.name ?? "Lecteur BooksBox"}
                </Link>
                {" · "}{list._count.entries} livre{list._count.entries !== 1 ? "s" : ""}
              </p>
              {list.description && (
                <p className="mt-3 max-w-2xl leading-7 text-white/65">{list.description}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {list.rating != null && (
                <div className="inline-flex items-center gap-1.5 rounded border border-amber/30 bg-amber/10 px-3 py-2">
                  <Star size={14} className="text-amber" fill="currentColor" />
                  <span className="text-lg font-black text-amber">{list.rating}</span>
                  <span className="text-xs text-muted">/5</span>
                </div>
              )}
              {isOwner && (
                <div className="mt-2">
                  <Link
                    href={`/lists/${listId}/edit`}
                    className="text-xs font-bold text-muted hover:text-mint transition"
                  >
                    Modifier la liste →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SectionHeader
        eyebrow={`${list._count.entries} livre${list._count.entries !== 1 ? "s" : ""}`}
        title="Livres de la liste"
      />

      {list.entries.length === 0 ? (
        <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
          Aucun livre dans cette liste pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {list.entries.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/books/${entry.bookId}`}
              className="group flex items-center gap-5 rounded border border-line bg-panel/80 p-4 transition hover:border-mint/50 hover:bg-panelSoft"
            >
              <div className="w-7 shrink-0 text-center text-lg font-black text-muted/50 group-hover:text-mint transition">
                {i + 1}
              </div>
              <div className="cover-sheen h-20 w-14 shrink-0 overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
                {entry.book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen size={20} className="text-white/25" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-black text-paper">{entry.book.title}</div>
                <div className="mt-1 text-sm text-muted">
                  {entry.book.authors.join(", ") || "Auteur inconnu"}
                </div>
                {entry.note && (
                  <p className="mt-2 line-clamp-2 text-sm italic leading-6 text-muted/70">
                    "{entry.note}"
                  </p>
                )}
              </div>
              {entry.book.publishedDate && (
                <div className="shrink-0 text-xs text-muted/60">{entry.book.publishedDate}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Section reviews */}
      {reviews.length > 0 && (
        <>
          <SectionHeader
            eyebrow={`${reviews.length} review${reviews.length !== 1 ? "s" : ""}`}
            title="Reviews des livres"
          />
          <ListReviews reviews={reviews} />
        </>
      )}
    </div>
  );
}
