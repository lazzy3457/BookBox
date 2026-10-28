import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Quote } from "lucide-react";
import { ReadingStatus } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBookDetails } from "@/server/services/books";
import { getBlockedUserIds } from "@/server/services/blocks";
import { authorHref } from "@/lib/authors";
import { genreLabel } from "@/lib/genres";
import { plural } from "@/lib/format";
import { StarRating } from "@/components/reviews/StarRating";
import { BookReviews } from "@/components/reviews/BookReviews";
import { BookCover } from "@/components/books/BookCover";
import { BookActionPanel } from "@/components/books/BookActionPanel";
import { ExpandableDescription } from "@/components/books/ExpandableDescription";
import { Avatar } from "@/components/ui/Avatar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const languageLabels: Record<string, string> = { fr: "Français", en: "Anglais", es: "Espagnol", it: "Italien", de: "Allemand", pt: "Portugais" };

export async function generateMetadata({ params }: { params: Promise<{ bookId: string }> }): Promise<Metadata> {
  const { bookId } = await params;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { title: true, authors: true, description: true, thumbnailUrl: true }
  });
  if (!book) return { title: "Livre introuvable", robots: { index: false, follow: false } };

  const authors = book.authors.join(", ") || "Auteur inconnu";
  const description = book.description?.slice(0, 155) ?? `Découvre ${book.title} de ${authors} sur BooksBox.`;
  return {
    title: book.title,
    description,
    alternates: { canonical: `/books/${bookId}` },
    openGraph: {
      type: "book",
      title: book.title,
      description,
      url: `/books/${bookId}`,
      images: book.thumbnailUrl ? [{ url: book.thumbnailUrl, alt: `Couverture de ${book.title}` }] : undefined
    },
    twitter: {
      card: book.thumbnailUrl ? "summary" : "summary_large_image",
      title: book.title,
      description,
      images: book.thumbnailUrl ? [book.thumbnailUrl] : undefined
    }
  };
}

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const [book, session] = await Promise.all([getBookDetails(bookId), getServerSession(authOptions)]);
  if (!book) notFound();

  const viewerId = session?.user?.id ?? null;
  const blocked = new Set(viewerId ? await getBlockedUserIds(viewerId) : []);
  const visibleReviews = book.reviews.filter((review) => !blocked.has(review.userId));

  const [userBook, authorBooks, follows] = await Promise.all([
    viewerId
      ? prisma.userBook.findUnique({
          where: { userId_bookId: { userId: viewerId, bookId: book.id } },
          include: { readingPeriods: { include: { entries: { orderBy: { entryDate: "desc" } } }, orderBy: { createdAt: "desc" }, take: 1 } }
        })
      : null,
    book.authors.length
      ? prisma.book.findMany({ where: { id: { not: book.id }, authors: { hasSome: book.authors } }, take: 5, select: { id: true, title: true, authors: true, thumbnailUrl: true } })
      : [],
    viewerId
      ? prisma.follow.findMany({
          where: { followerId: viewerId, following: { suspendedAt: null } },
          select: {
            following: {
              select: {
                id: true,
                name: true,
                image: true,
                library: { where: { bookId: book.id }, select: { status: true } },
                reviews: { where: { bookId: book.id, hiddenAt: null, spoiler: false }, select: { body: true, rating: true }, take: 1 }
              }
            }
          }
        })
      : []
  ]);

  const averageRating = visibleReviews.length ? visibleReviews.reduce((total, review) => total + review.rating, 0) / visibleReviews.length : null;
  const counts = {
    read: book.libraries.filter((entry) => entry.status === ReadingStatus.READ).length,
    reading: book.libraries.filter((entry) => entry.status === ReadingStatus.READING).length,
    toRead: book.libraries.filter((entry) => entry.status === ReadingStatus.TO_READ).length
  };

  const friends = follows.map((follow) => follow.following).filter((friend) => friend.library.length && !blocked.has(friend.id));
  const friendsFinished = friends.filter((friend) => friend.library[0]?.status === ReadingStatus.READ).length;
  const friendsReading = friends.filter((friend) => friend.library[0]?.status === ReadingStatus.READING).length;
  const friendQuote = friends.find((friend) => friend.reviews[0]?.body);

  const toView = (review: (typeof visibleReviews)[number]) => ({
    id: review.id,
    rating: review.rating,
    body: review.body,
    spoiler: review.spoiler,
    userId: review.userId,
    userName: review.user.name ?? "Lecteur BooksBox",
    userImage: review.user.image,
    canManage: review.userId === viewerId,
    canReport: Boolean(viewerId && review.userId !== viewerId),
    reactionsCount: review.reactions.length,
    comments: review.comments
      .filter((comment) => !blocked.has(comment.userId))
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        userName: comment.user.name ?? "Lecteur BooksBox",
        canManage: comment.userId === viewerId,
        createdAt: comment.createdAt.toISOString(),
        likesCount: comment.likes.length
      }))
  });

  // L'avis mis en avant : le plus aimé, avec un vrai texte, d'un autre lecteur.
  const featured = [...visibleReviews]
    .filter((review) => review.body && review.body.length > 40 && review.userId !== viewerId && review.reactions.length > 0)
    .sort((a, b) => b.reactions.length - a.reactions.length)[0];
  const otherReviews = visibleReviews.filter((review) => review.id !== featured?.id);

  const details = [
    { label: "Pages", value: book.pageCount ? String(book.pageCount) : null },
    { label: "Publication", value: book.publishedDate?.slice(0, 4) ?? null },
    { label: "Éditeur", value: book.publisher },
    { label: "Langue", value: book.language ? languageLabels[book.language] ?? book.language.toUpperCase() : null }
  ].filter((detail) => detail.value);

  const anchors = [
    { href: "#a-propos", label: "À propos" },
    friends.length ? { href: "#amis", label: "Tes amis" } : null,
    { href: "#avis", label: `Avis (${visibleReviews.length})` },
    authorBooks.length ? { href: "#auteur", label: "Du même auteur" } : null
  ].filter((anchor): anchor is { href: string; label: string } => Boolean(anchor));

  const period = userBook?.readingPeriods[0];

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-9 lg:order-1">
        <header className="flex flex-col gap-3">
          {book.genres.length ? (
            <div className="flex flex-wrap gap-2">
              {book.genres.slice(0, 3).map((genre) => (
                <Link key={genre} href={`/search?genre=${genre}`} className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-paper hover:border-mint/50">{genreLabel(genre)}</Link>
              ))}
            </div>
          ) : null}
          <h1 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">{book.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {book.authors.length ? (
              book.authors.map((author) => (
                <Link key={author} href={authorHref(author)} className="font-display text-lg font-semibold text-mint hover:underline">{author}</Link>
              ))
            ) : (
              <span className="text-sm text-muted">Auteur inconnu</span>
            )}
            {averageRating ? (
              <span className="flex items-center gap-2 text-xs font-bold text-muted">
                <StarRating value={Math.round(averageRating)} />
                {averageRating.toFixed(1).replace(".", ",")} · {plural(visibleReviews.length, "note")}
              </span>
            ) : null}
          </div>
          <nav aria-label="Sections de la fiche" className="flex flex-wrap gap-2 pt-1">
            {anchors.map((anchor) => (
              <a key={anchor.href} href={anchor.href} className="rounded-full border border-line bg-panel px-3 py-1 text-[11px] font-bold text-paper hover:border-mint/50">{anchor.label}</a>
            ))}
          </nav>
        </header>

        <section id="a-propos" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="bb-h2">À propos du livre</h2>
          {book.description ? <ExpandableDescription text={book.description} /> : <p className="text-sm text-muted">Aucune description disponible pour ce livre.</p>}
          {details.length ? (
            <dl className="flex flex-wrap gap-x-12 gap-y-3 pt-1">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="bb-label text-muted">{detail.label}</dt>
                  <dd className="font-display text-[15px] font-semibold text-paper">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {friends.length ? (
          <section id="amis" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="bb-h2">Tes amis et ce livre</h2>
            <div className="bb-card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex -space-x-1.5">
                  {friends.slice(0, 4).map((friend) => (
                    <Link key={friend.id} href={`/profile/${friend.id}`} title={friend.name ?? undefined}>
                      <Avatar name={friend.name} image={friend.image} size={26} className="border-2 border-panel" />
                    </Link>
                  ))}
                </span>
                <span className="text-[13px] font-bold text-mint">
                  {[plural(friends.length, "ami"), friendsReading ? `${friendsReading} le ${friendsReading > 1 ? "lisent" : "lit"}` : null, friendsFinished ? `${friendsFinished} l'${friendsFinished > 1 ? "ont" : "a"} terminé` : null].filter(Boolean).join(" · ")}
                </span>
              </div>
              {friendQuote?.reviews[0]?.body ? (
                <p className="flex gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs italic text-paper">
                  <Quote size={13} aria-hidden className="mt-0.5 shrink-0 text-coral" />
                  « {friendQuote.reviews[0].body.length > 160 ? `${friendQuote.reviews[0].body.slice(0, 160)}…` : friendQuote.reviews[0].body} » — {friendQuote.name ?? "Un ami"}, {friendQuote.reviews[0].rating}/5
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <BookReviews
          bookId={book.id}
          isSignedIn={Boolean(viewerId)}
          hasUserReview={visibleReviews.some((review) => review.userId === viewerId)}
          averageRating={averageRating}
          featured={featured ? { ...toView(featured), commentsCount: featured.comments.length, liked: featured.reactions.some((reaction) => reaction.userId === viewerId && reaction.kind === "LIKE") } : null}
          reviews={otherReviews.map(toView)}
        />

        {authorBooks.length ? (
          <section id="auteur" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="bb-h2">Du même auteur</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {authorBooks.map((entry) => (
                <Link key={entry.id} href={`/books/${entry.id}`} className="group flex min-w-0 flex-col gap-1">
                  <BookCover title={entry.title} thumbnailUrl={entry.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster transition group-hover:-translate-y-1" iconSize={16} />
                  <span className="line-clamp-2 pt-2 font-display text-sm font-semibold text-paper">{entry.title}</span>
                  <span className="truncate text-[11px] text-muted">{entry.authors[0]}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="order-first lg:order-2">
        <BookActionPanel
          bookId={book.id}
          title={book.title}
          thumbnailUrl={book.thumbnailUrl}
          pageCount={book.pageCount}
          isSignedIn={Boolean(viewerId)}
          status={userBook?.status ?? null}
          isFavorite={userBook?.isFavorite ?? false}
          period={
            period
              ? {
                  id: period.id,
                  startedAt: period.startedAt?.toISOString() ?? null,
                  entries: period.entries.map((entry) => ({
                    id: entry.id,
                    entryDate: entry.entryDate.toISOString(),
                    page: entry.page,
                    percentage: entry.percentage,
                    chapter: entry.chapter,
                    note: entry.note
                  }))
                }
              : null
          }
          counts={counts}
        />
      </div>
    </div>
  );
}
