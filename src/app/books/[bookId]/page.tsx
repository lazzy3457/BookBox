import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { BookOpen, BookOpenCheck, Heart, MessageSquareText, Star, UsersRound } from "lucide-react";
import { ReadingStatus } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBookDetails } from "@/server/services/books";
import { authorHref } from "@/lib/authors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LibraryActions } from "@/components/library/LibraryActions";
import { FavoriteButton } from "@/components/library/FavoriteButton";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { AddToListButton } from "@/components/lists/AddToListButton";
import { StarRating } from "@/components/reviews/StarRating";
import { BookCard } from "@/components/books/BookCard";
import { ExpandableDescription } from "@/components/books/ExpandableDescription";

export const dynamic = "force-dynamic";

const sourceLabels: Record<string, string> = {
  google_books: "Google Books",
  manual: "Ajout manuel"
};

function formatValue(value: string | number | null | undefined, fallback = "Inconnu") {
  return value ?? fallback;
}

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  const [book, session] = await Promise.all([
    getBookDetails(bookId),
    getServerSession(authOptions)
  ]);

  if (!book) notFound();

  const userBook = session?.user?.id
    ? await prisma.userBook.findUnique({
        where: { userId_bookId: { userId: session.user.id, bookId: book.id } }
      })
    : null;

  const currentUserReview = session?.user?.id
    ? book.reviews.find((review) => review.userId === session.user?.id)
    : null;

  const averageRating = book.reviews.length
    ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
    : null;
  const readCount = book.libraries.filter((entry) => entry.status === ReadingStatus.READ).length;
  const readingCount = book.libraries.filter((entry) => entry.status === ReadingStatus.READING).length;
  const toReadCount = book.libraries.filter((entry) => entry.status === ReadingStatus.TO_READ).length;
  const abandonedCount = book.libraries.filter((entry) => entry.status === ReadingStatus.ABANDONED).length;
  const favoriteCount = book.libraries.filter((entry) => entry.isFavorite).length;
  const authorBooks = book.authors.length
    ? await prisma.book.findMany({
        where: {
          id: { not: book.id },
          authors: { hasSome: book.authors }
        },
        include: {
          reviews: true
        },
        take: 6
      })
    : [];
  const mappedAuthorBooks = authorBooks.map((entry) => ({
    ...entry,
    averageRating: entry.reviews.length
      ? entry.reviews.reduce((total, review) => total + review.rating, 0) / entry.reviews.length
      : null
  }));
  const followingActivity = session?.user?.id
    ? await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: {
          following: {
            select: {
              id: true,
              name: true,
              image: true,
              reviews: {
                where: { bookId: book.id },
                orderBy: { createdAt: "desc" },
                take: 1
              },
              library: {
                where: { bookId: book.id },
                take: 1
              }
            }
          }
        },
        take: 6
      })
    : [];
  const activeFollowing = followingActivity
    .map((follow) => follow.following)
    .filter((user) => user.reviews.length || user.library.length);

  const stats = [
    { label: "Moyenne", value: averageRating ? averageRating.toFixed(1) : "-", icon: Star },
    { label: "Reviews", value: book.reviews.length, icon: MessageSquareText },
    { label: "Lecteurs", value: book.libraries.length, icon: UsersRound },
    { label: "Favoris", value: favoriteCount, icon: Heart }
  ];

  const details = [
    { label: "Publication", value: book.publishedDate ?? "Inconnue" },
    { label: "Editeur", value: book.publisher ?? "Inconnu" },
    { label: "Pages", value: book.pageCount ? `${book.pageCount} pages` : "Inconnu" },
    { label: "Langue", value: book.language?.toUpperCase() ?? "Inconnue" },
    { label: "Source", value: sourceLabels[book.source] ?? book.source },
    { label: "Identifiant", value: book.googleBooksVolumeId ?? "Non renseigne" }
  ];

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-coral" />
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-mint">Fiche livre</div>
            <h1 className="max-w-3xl text-5xl font-black leading-none text-paper">{book.title}</h1>

            <div className="mt-6 grid gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="cover-sheen grid aspect-[2/3] place-items-center overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
                {book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen size={64} className="text-white/25" />
                )}
              </div>

              <div className="flex min-w-0 flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-muted">
                  {book.authors.length ? (
                    book.authors.map((author, index) => (
                      <span key={author} className="inline-flex items-center gap-2">
                        <Link href={authorHref(author)} className="text-paper transition hover:text-mint">
                          {author}
                        </Link>
                        {index < book.authors.length - 1 ? <span className="text-muted/60">/</span> : null}
                      </span>
                    ))
                  ) : (
                    <span>Auteur inconnu</span>
                  )}
                </div>
                {book.description ? (
                  <ExpandableDescription text={book.description} />
                ) : (
                  <p className="mt-5 max-w-3xl leading-7 text-muted">Aucune description disponible pour ce livre.</p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded border border-line bg-ink/45 px-3 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-muted">
                        <stat.icon size={13} />
                        {stat.label}
                      </div>
                      <div className="text-xl font-black text-paper">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="self-start space-y-4">
            <div className="rounded border border-line bg-ink/55 p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">Bibliotheque</h2>
              <LibraryActions bookId={book.id} initialStatus={userBook?.status ?? null} />
              {userBook ? <FavoriteButton bookId={book.id} initial={userBook.isFavorite} /> : null}
              {session?.user?.id ? <AddToListButton bookId={book.id} /> : null}
            </div>
            <div className="rounded border border-line bg-panel/75 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted">
                <BookOpenCheck size={14} />
                Lecture
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-muted">
                <div className="rounded bg-ink/55 px-2 py-2">
                  <div className="text-base font-black text-paper">{readCount}</div>
                  lus
                </div>
                <div className="rounded bg-ink/55 px-2 py-2">
                  <div className="text-base font-black text-paper">{readingCount}</div>
                  en cours
                </div>
                <div className="rounded bg-ink/55 px-2 py-2">
                  <div className="text-base font-black text-paper">{toReadCount}</div>
                  a lire
                </div>
                <div className="rounded bg-ink/55 px-2 py-2">
                  <div className="text-base font-black text-paper">{abandonedCount}</div>
                  abandonne
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionHeader
        eyebrow="Details"
        title="Metadonnees et discussions"
        description="Une fiche media pour comprendre le livre, voir les notes de la communaute et publier ta review."
      />

      <div className="grid gap-8 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded border border-line bg-panel/75 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-muted">Infos livre</h2>
            <div className="space-y-4 text-sm">
              {details.map((detail) => (
                <div key={detail.label} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-muted/70">{detail.label}</div>
                  <div className="mt-1 font-bold text-paper">{formatValue(detail.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {averageRating ? (
            <div className="rounded border border-line bg-panel/75 p-5">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">Note moyenne</h2>
              <div className="flex items-center gap-3">
                <StarRating value={Math.round(averageRating)} />
                <span className="text-sm font-black text-paper">{averageRating.toFixed(1)}/5</span>
              </div>
            </div>
          ) : null}

          <div className="rounded border border-line bg-panel/75 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-muted">Activite de tes follows</h2>
            {session?.user?.id ? (
              activeFollowing.length ? (
                <div className="space-y-3">
                  {activeFollowing.map((user) => {
                    const review = user.reviews[0];
                    const libraryEntry = user.library[0];

                    return (
                      <div key={user.id} className="rounded border border-line bg-ink/45 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded bg-mint text-xs font-black text-ink">
                            {user.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (user.name ?? "L").slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-paper">{user.name ?? "Lecteur BooksBox"}</div>
                            <div className="mt-1 text-xs text-muted">
                              {review ? `a publie une review ${review.rating}/5` : "a ajoute ce livre a sa bibliotheque"}
                              {libraryEntry ? ` · ${libraryEntry.status}` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted">Aucune activite de tes follows sur ce livre pour le moment.</p>
              )
            ) : (
              <p className="text-sm leading-6 text-muted">Connecte-toi pour voir l'activite de tes follows sur ce livre.</p>
            )}
          </div>
        </aside>

        <section className="space-y-8">
          <ReviewComposer bookId={book.id} hasUserReview={Boolean(currentUserReview)} />

          {mappedAuthorBooks.length ? (
            <div>
              <SectionHeader eyebrow="Auteur" title="Autres livres" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {mappedAuthorBooks.map((entry) => (
                  <BookCard key={entry.id} book={entry} href={`/books/${entry.id}`} variant="poster" showScore={false} />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="mb-4 text-xl font-black text-paper">Reviews</h2>
            <div className="space-y-4">
              {book.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{
                    id: review.id,
                    rating: review.rating,
                    body: review.body,
                    spoiler: review.spoiler,
                    userId: review.userId,
                    userName: review.user.name ?? "Lecteur BooksBox",
                    userImage: review.user.image,
                    canManage: review.userId === session?.user?.id,
                    reactionsCount: review.reactions.length,
                    comments: review.comments.map((comment) => ({
                      id: comment.id,
                      body: comment.body,
                      userName: comment.user.name ?? "Lecteur BooksBox",
                      canManage: comment.userId === session?.user?.id,
                      createdAt: comment.createdAt.toISOString(),
                      likesCount: comment.likes.length
                    }))
                  }}
                />
              ))}
              {!book.reviews.length ? (
                <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                  Aucune review pour ce livre. La premiere review donnera le ton.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
