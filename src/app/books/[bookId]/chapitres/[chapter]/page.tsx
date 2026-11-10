import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getChapterReviews, getReaderChapter } from "@/server/services/chapters";
import { toCommentView } from "@/server/services/comments";
import { chapterHref, chaptersHref, isChapterUnlocked, MAX_CHAPTER, parseChapter } from "@/lib/chapters";
import { formatRating, plural } from "@/lib/format";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { ChapterGate } from "@/components/chapters/ChapterGate";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ bookId: string; chapter: string }>;
  searchParams: Promise<{ reveler?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId, chapter } = await params;
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
  // Pages d'avis qui dévoilent l'histoire : hors des moteurs de recherche.
  return { title: book && parseChapter(chapter) ? `${book.title} · chapitre ${chapter}` : "Chapitre introuvable", robots: { index: false, follow: false } };
}

export default async function BookChapterPage({ params, searchParams }: PageProps) {
  const [{ bookId, chapter: chapterParam }, { reveler }] = await Promise.all([params, searchParams]);
  const chapter = parseChapter(chapterParam);
  if (chapter === null) notFound();

  const [book, session] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, authors: true } }),
    getSession()
  ]);
  if (!book) notFound();

  const viewerId = session?.user?.id ?? null;
  const blocked = viewerId ? await getBlockedUserIds(viewerId) : [];
  const [reviews, reader] = await Promise.all([getChapterReviews(book.id, chapter, blocked), getReaderChapter(viewerId, book.id)]);

  // Les avis ne sont envoyés au navigateur que si le chapitre est ouvert, ou révélé volontairement.
  const hasOwnReview = reviews.some((review) => review.userId === viewerId);
  const unlocked = isChapterUnlocked(chapter, reader) || hasOwnReview;
  const visible = unlocked || reveler === "1";
  const averageRating = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
      <Link href={chaptersHref(book.id)} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-mint hover:underline">
        <ArrowLeft size={14} aria-hidden /> Tous les chapitres
      </Link>

      <header className="flex min-w-0 flex-col gap-1.5">
        <Link href={`/books/${book.id}`} className="bb-label w-fit text-mint hover:underline">{book.title}</Link>
        <h1 className="bb-h1">Chapitre {chapter}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {book.authors.join(", ") || "Auteur inconnu"}
          {visible && averageRating ? (
            <>
              <StarRating value={averageRating} />
              <span>{formatRating(averageRating)} · {plural(reviews.length, "avis", "avis")}</span>
            </>
          ) : null}
        </p>
      </header>

      {visible ? (
        <>
          {!unlocked ? (
            <p className="rounded border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-muted">
              Tu as révélé ce chapitre sans l&apos;avoir marqué comme lu : les avis ci-dessous dévoilent l&apos;histoire jusqu&apos;ici.
            </p>
          ) : null}

          {viewerId && !hasOwnReview ? (
            <ReviewComposer bookId={book.id} chapter={chapter} />
          ) : !viewerId ? (
            <p className="bb-card-flat p-4 text-sm text-muted">
              <Link href={`/login?callbackUrl=${chapterHref(book.id, chapter)}`} className="font-extrabold text-mint hover:underline">Connecte-toi</Link> pour donner ton avis sur ce chapitre.
            </p>
          ) : null}

          <section className="flex flex-col gap-4">
            <h2 className="bb-h2">Les avis sur ce chapitre</h2>
            {reviews.length ? (
              reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{
                    id: review.id,
                    chapter: review.chapter,
                    rating: review.rating,
                    body: review.body,
                    spoiler: review.spoiler,
                    userId: review.userId,
                    userName: review.user.name ?? "Lecteur BooksBox",
                    userImage: review.user.image,
                    canManage: review.userId === viewerId,
                    canReport: Boolean(viewerId && review.userId !== viewerId),
                    reactionsCount: review.reactions.length,
                    comments: review.comments.filter((comment) => !blocked.includes(comment.userId)).map((comment) => toCommentView(comment, viewerId))
                  }}
                />
              ))
            ) : (
              <p className="bb-card-flat p-5 text-sm text-muted">Aucun avis sur ce chapitre. Le premier donnera le ton.</p>
            )}
          </section>
        </>
      ) : (
        <ChapterGate bookId={book.id} chapter={chapter} reviewsCount={reviews.length} isSignedIn={Boolean(viewerId)} />
      )}

      <nav aria-label="Chapitres voisins" className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {chapter > 1 ? (
          <Link href={chapterHref(book.id, chapter - 1)} className="bb-btn-ghost">
            <ArrowLeft size={15} aria-hidden /> Chapitre {chapter - 1}
          </Link>
        ) : <span />}
        {chapter < MAX_CHAPTER ? (
          <Link href={chapterHref(book.id, chapter + 1)} className="bb-btn-ghost">
            Chapitre {chapter + 1} <ArrowRight size={15} aria-hidden />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
