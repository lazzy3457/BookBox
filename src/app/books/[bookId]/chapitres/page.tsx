import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, LockOpen } from "lucide-react";
import type { Metadata } from "next";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getChapterSummaries, getReaderChapter } from "@/server/services/chapters";
import { chapterHref, chaptersHref, isChapterUnlocked } from "@/lib/chapters";
import { plural, timeAgo } from "@/lib/format";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { ChapterProgressControl } from "@/components/chapters/ChapterProgressControl";

export const dynamic = "force-dynamic";

const bookSelect = { id: true, title: true, authors: true, thumbnailUrl: true } as const;

export async function generateMetadata({ params }: { params: Promise<{ bookId: string }> }): Promise<Metadata> {
  const { bookId } = await params;
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
  if (!book) return { title: "Livre introuvable", robots: { index: false, follow: false } };
  return {
    title: `${book.title} · chapitre par chapitre`,
    description: `Les avis des lecteurs sur ${book.title}, chapitre par chapitre et sans spoiler.`,
    alternates: { canonical: chaptersHref(bookId) }
  };
}

export default async function BookChaptersPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const [book, session] = await Promise.all([prisma.book.findUnique({ where: { id: bookId }, select: bookSelect }), getSession()]);
  if (!book) notFound();

  const viewerId = session?.user?.id ?? null;
  const blocked = viewerId ? await getBlockedUserIds(viewerId) : [];
  const [summaries, reader] = await Promise.all([getChapterSummaries(book.id, blocked), getReaderChapter(viewerId, book.id)]);

  // Les chapitres qui ont des avis, plus celui où en est le lecteur.
  const byChapter = new Map(summaries.map((summary) => [summary.chapter, summary]));
  if (reader.chapter > 0 && !byChapter.has(reader.chapter)) {
    byChapter.set(reader.chapter, { chapter: reader.chapter, reviews: 0, averageRating: null, lastReviewAt: null });
  }
  const chapters = [...byChapter.values()].sort((a, b) => a.chapter - b.chapter);
  const totalReviews = summaries.reduce((total, summary) => total + summary.reviews, 0);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
      <Link href={`/books/${book.id}`} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-mint hover:underline">
        <ArrowLeft size={14} aria-hidden /> Retour à la fiche du livre
      </Link>

      <header className="flex min-w-0 items-start gap-4">
        <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="aspect-[2/3] w-16 shrink-0 shadow-poster sm:w-20" iconSize={16} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="bb-label text-mint">Lire en communauté</span>
          <h1 className="bb-h1">{book.title}, chapitre par chapitre</h1>
          <p className="text-sm text-muted">
            {book.authors.join(", ") || "Auteur inconnu"}
            {totalReviews ? ` · ${plural(totalReviews, "avis", "avis")} sur ${plural(summaries.length, "chapitre")}` : ""}
          </p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        Ici, chaque chapitre a ses propres avis. Tu ne vois que ceux des chapitres que tu as déjà lus : dis où tu en es, et discute de ta lecture sans te faire dévoiler la suite.
      </p>

      {reader.finished ? (
        <p className="bb-card-flat flex items-center gap-2 p-4 text-sm text-paper">
          <LockOpen size={16} aria-hidden className="shrink-0 text-mint" />
          Tu as terminé ce livre : tous les chapitres te sont ouverts.
        </p>
      ) : null}

      {viewerId ? (
        <ChapterProgressControl bookId={book.id} initialChapter={reader.chapter} />
      ) : (
        <p className="bb-card-flat p-4 text-sm text-muted">
          <Link href={`/login?callbackUrl=${chaptersHref(book.id)}`} className="font-extrabold text-mint hover:underline">Connecte-toi</Link> pour indiquer où tu en es et donner ton avis sur un chapitre.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="bb-h2">Les chapitres</h2>
        {chapters.length ? (
          <ul className="flex flex-col gap-2">
            {chapters.map((entry) => {
              const unlocked = isChapterUnlocked(entry.chapter, reader);
              return (
                <li key={entry.chapter}>
                  <Link href={chapterHref(book.id, entry.chapter)} className="bb-card flex min-w-0 items-center gap-3 p-4 transition hover:border-mint/50">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${unlocked ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
                      {unlocked ? <LockOpen size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-display text-base font-semibold text-paper">
                        Chapitre {entry.chapter}
                        {entry.chapter === reader.chapter && !reader.finished ? <span className="ml-2 rounded-full bg-mint/10 px-2 py-0.5 text-[11px] font-extrabold text-mint">Tu en es là</span> : null}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {entry.reviews ? plural(entry.reviews, "avis", "avis") : "Aucun avis pour l'instant"}
                        {/* La note d'un chapitre pas encore lu en dit déjà trop : elle reste cachée. */}
                        {unlocked && entry.averageRating ? <StarRating value={entry.averageRating} size={13} /> : null}
                        {entry.lastReviewAt ? <span>· dernier avis {timeAgo(entry.lastReviewAt)}</span> : null}
                        {!unlocked ? <span className="font-bold text-coral">· pas encore lu</span> : null}
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="bb-card-flat p-5 text-sm text-muted">Aucun avis de chapitre pour ce livre. Choisis un chapitre et donne le premier !</p>
        )}
      </section>
    </div>
  );
}
