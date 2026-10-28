import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { ArrowRight, Check, ChevronDown, Search, UserRound } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { slugifyAuthor } from "@/lib/authors";
import { plural } from "@/lib/format";
import { ExpandableDescription } from "@/components/books/ExpandableDescription";
import { AuthorExternalEditions } from "@/components/authors/AuthorExternalEditions";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { AddToReadButton } from "@/components/library/AddToReadButton";
import { ReviewLikeButton } from "@/components/reviews/ReviewLikeButton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type AuthorSummary = {
  extract?: string;
  thumbnail?: {
    source?: string;
  };
};

async function findAuthorBookIds(authorSlug: string) {
  const books = await prisma.book.findMany({ where: { authors: { isEmpty: false } }, select: { id: true, authors: true }, take: 5000 });
  const matches = books.filter((book) => book.authors.some((author) => slugifyAuthor(author) === authorSlug));
  const name = matches[0]?.authors.find((author) => slugifyAuthor(author) === authorSlug) ?? null;
  return { name, ids: matches.map((book) => book.id) };
}

export async function generateMetadata({ params }: { params: Promise<{ authorSlug: string }> }): Promise<Metadata> {
  const { authorSlug } = await params;
  const { name } = await findAuthorBookIds(authorSlug);
  if (!name) return { title: "Auteur introuvable", robots: { index: false, follow: false } };

  const description = `Découvre les livres, éditions et avis autour de ${name} sur BooksBox.`;
  return {
    title: name,
    description,
    alternates: { canonical: `/authors/${authorSlug}` },
    openGraph: { title: name, description, url: `/authors/${authorSlug}` }
  };
}

async function getAuthorSummary(authorName: string) {
  const candidates = [
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { next: { revalidate: 604800 } });
      if (!response.ok) continue;
      const payload = (await response.json()) as AuthorSummary;
      if (payload.extract || payload.thumbnail?.source) {
        return { bio: payload.extract ?? null, image: payload.thumbnail?.source ?? null };
      }
    } catch {
      continue;
    }
  }

  return { bio: null, image: null };
}

// Repère les cycles à partir des titres (« Dune - Tome 2 », « L'Assassin royal (Tome 1) »…).
function seriesOf(title: string) {
  const match = title.match(/^(.*?)[\s,:(–-]*(?:tome|t\.|vol\.?|volume|livre)\s*(\d+)/i);
  if (!match || !match[1].trim()) return null;
  return { name: match[1].replace(/[\s(–-]+$/, "").trim(), number: Number(match[2]) };
}

function year(value: string | null) {
  return value?.slice(0, 4) ?? null;
}

export default async function AuthorPage({ params }: { params: Promise<{ authorSlug: string }> }) {
  const { authorSlug } = await params;
  const [{ name: authorName, ids }, session] = await Promise.all([findAuthorBookIds(authorSlug), getServerSession(authOptions)]);
  if (!authorName) notFound();

  const viewerId = session?.user?.id ?? null;
  const blocked = new Set(viewerId ? await getBlockedUserIds(viewerId) : []);
  const [books, authorSummary, myEntries] = await Promise.all([
    prisma.book.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        publishedDate: true,
        libraries: { where: { user: { suspendedAt: null } }, select: { userId: true } },
        reviews: {
          where: { hiddenAt: null, user: { suspendedAt: null } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            body: true,
            spoiler: true,
            createdAt: true,
            userId: true,
            user: { select: { name: true, image: true } },
            _count: { select: { reactions: true, comments: true } },
            reactions: { where: { userId: viewerId ?? "", kind: "LIKE" }, select: { id: true } }
          }
        }
      }
    }),
    getAuthorSummary(authorName),
    viewerId
      ? prisma.userBook.findMany({
          where: { userId: viewerId, bookId: { in: ids } },
          select: {
            bookId: true,
            status: true,
            readingPeriods: { orderBy: { createdAt: "desc" }, take: 1, select: { entries: { orderBy: { entryDate: "desc" }, take: 1, select: { page: true, percentage: true } } } }
          }
        })
      : []
  ]);

  const statusByBook = new Map(myEntries.map((entry) => [entry.bookId, entry]));
  const byDate = [...books].sort((a, b) => (a.publishedDate ?? "9999").localeCompare(b.publishedDate ?? "9999"));
  const allReviews = books.flatMap((book) => book.reviews.filter((review) => !blocked.has(review.userId)).map((review) => ({ ...review, bookTitle: book.title, bookId: book.id })));
  const averageRating = allReviews.length ? allReviews.reduce((total, review) => total + review.rating, 0) / allReviews.length : null;
  const readerCount = new Set(books.flatMap((book) => book.libraries.map((entry) => entry.userId))).size;

  const seriesMap = new Map<string, Array<{ book: (typeof books)[number]; number: number }>>();
  byDate.forEach((book) => {
    const series = seriesOf(book.title);
    if (!series) return;
    const list = seriesMap.get(series.name) ?? [];
    list.push({ book, number: series.number });
    seriesMap.set(series.name, list);
  });
  const cycles = [...seriesMap.entries()].filter(([, list]) => list.length > 1).map(([name, list]) => ({ name, books: list.sort((a, b) => a.number - b.number) }));
  const inCycle = new Set(cycles.flatMap((cycle) => cycle.books.map((entry) => entry.book.id)));
  const others = byDate.filter((book) => !inCycle.has(book.id));

  const orderedForReading = [...cycles.flatMap((cycle) => cycle.books.map((entry) => entry.book)), ...others];
  const readCount = myEntries.filter((entry) => entry.status === ReadingStatus.READ).length;
  const readingCount = myEntries.filter((entry) => entry.status === ReadingStatus.READING).length;
  const hasRead = readCount + readingCount > 0;
  const nextBook = hasRead ? orderedForReading.find((book) => !statusByBook.has(book.id)) : null;

  const ratingOf = (book: (typeof books)[number]) => (book.reviews.length ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length : 0);
  const starter = !hasRead
    ? [...books].sort((a, b) => b.libraries.length - a.libraries.length || ratingOf(b) - ratingOf(a))[0]
    : null;
  const starterRating = starter ? ratingOf(starter) : 0;

  const recentReviews = allReviews.filter((review) => review.body).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);

  function bookStatus(bookId: string) {
    const entry = statusByBook.get(bookId);
    if (entry?.status === ReadingStatus.READ) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-[#4f7a4f]/10 px-2.5 py-1 text-[11px] font-extrabold text-[#4f7a4f]"><Check size={12} aria-hidden />Lu</span>;
    }
    if (entry?.status === ReadingStatus.READING) {
      const progress = entry.readingPeriods[0]?.entries[0];
      return <span className="rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-extrabold text-mint">En cours{progress?.percentage != null ? ` · ${progress.percentage} %` : ""}</span>;
    }
    if (entry) return <span className="rounded-full bg-panelSoft px-2.5 py-1 text-[11px] font-extrabold text-muted">{entry.status === ReadingStatus.TO_READ ? "À lire" : "Abandonné"}</span>;
    if (nextBook?.id === bookId) return <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-extrabold text-mint"><ArrowRight size={12} aria-hidden />Prochain conseillé</span>;
    return <AddToReadButton bookId={bookId} isSignedIn={Boolean(viewerId)} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section className="bb-card grid gap-6 p-6 sm:p-7 md:grid-cols-[150px_minmax(0,1fr)_auto]">
        <div className="grid h-[150px] w-[150px] place-items-center overflow-hidden rounded-full bg-panelSoft text-muted">
          {authorSummary.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={authorSummary.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound size={44} aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="bb-label text-coral">Auteur</p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-[44px]">{authorName}</h1>
          <ExpandableDescription text={authorSummary.bio ?? `Les livres de ${authorName} présents sur BooksBox, avec les notes et discussions de la communauté.`} />
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-1">
            {averageRating ? (
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-paper">
                <StarRating value={Math.round(averageRating)} />
                {averageRating.toFixed(1).replace(".", ",")} de moyenne
              </span>
            ) : null}
            <dl className="flex gap-6">
              {[
                [books.length, "livres"],
                [allReviews.length, "avis"],
                [readerCount, "lecteurs"]
              ].map(([value, label]) => (
                <div key={label}>
                  <dd className="font-display text-xl font-semibold leading-tight text-paper">{value}</dd>
                  <dt className="text-[11px] text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {hasRead ? (
          <div className="flex h-fit flex-col gap-2 rounded-xl bg-ink p-5 md:w-[260px]">
            <p className="bb-h3 text-base">Toi et {authorName}</p>
            <p className="text-xs text-muted">{plural(readCount, "livre lu", "livres lus")} sur {books.length}{readingCount ? ` · ${readingCount} en cours` : ""}</p>
            <div className="bb-track bg-panelSoft"><div className="h-full rounded-full bg-mint" style={{ width: `${Math.round((readCount / Math.max(1, books.length)) * 100)}%` }} /></div>
            {nextBook ? (
              <Link href={`/books/${nextBook.id}`} className="text-xs font-extrabold text-mint hover:underline">Prochain conseillé : {nextBook.title}</Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {starter ? (
        <section className="grid items-center gap-7 rounded bg-gradient-to-r from-mint to-[#9a4a3e] p-7 text-ink sm:grid-cols-[150px_minmax(0,1fr)] sm:p-9">
          <Link href={`/books/${starter.id}`}>
            <BookCover title={starter.title} thumbnailUrl={starter.thumbnailUrl} showTitle className="h-[220px] w-[150px] shadow-poster" iconSize={16} />
          </Link>
          <div className="flex flex-col items-start gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f0b48f]">Par où commencer ?</p>
            <h2 className="font-display text-3xl font-semibold leading-tight">Commence par {starter.title}</h2>
            <p className="max-w-2xl text-sm text-ink/85">
              C&apos;est le livre de {authorName} le plus lu sur BooksBox ({plural(starter.libraries.length, "lecteur")}){starterRating ? ` et l'un des mieux notés (${starterRating.toFixed(1).replace(".", ",")})` : ""}.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <AddToReadButton bookId={starter.id} isSignedIn={Boolean(viewerId)} />
              <Link href={`/books/${starter.id}`} className="bb-btn border border-ink/40 px-4 py-1.5 text-xs text-ink hover:bg-ink/10">Voir la fiche</Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="bb-h2">Ses livres</h2>
            <span className="text-xs text-muted">{plural(books.length, "livre")} · du premier au dernier</span>
          </div>

          {cycles.map((cycle) => {
            const readInCycle = cycle.books.filter((entry) => statusByBook.get(entry.book.id)?.status === ReadingStatus.READ).length;
            return (
              <section key={cycle.name} className="bb-card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="bb-h3 text-xl">{cycle.name}</h3>
                    <p className="text-xs text-muted">{plural(cycle.books.length, "tome")} · dans l&apos;ordre de lecture</p>
                  </div>
                  <span className="text-xs font-extrabold text-mint">{hasRead ? `${readInCycle} / ${cycle.books.length} lu${readInCycle > 1 ? "s" : ""}` : plural(cycle.books.length, "tome")}</span>
                </div>
                <ol className="divide-y divide-line">
                  {cycle.books.map((entry) => (
                    <li key={entry.book.id} className="flex items-center gap-4 py-3">
                      <span className="w-6 text-center font-display text-2xl font-semibold text-mint">{entry.number}</span>
                      <Link href={`/books/${entry.book.id}`}><BookCover title={entry.book.title} thumbnailUrl={entry.book.thumbnailUrl} className="h-12 w-8 rounded-md" iconSize={0} /></Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/books/${entry.book.id}`} className="block truncate font-display text-[15px] font-semibold text-paper hover:text-mint">{entry.book.title}</Link>
                        <p className="text-[11px] text-muted">{year(entry.book.publishedDate)}</p>
                      </div>
                      {bookStatus(entry.book.id)}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          {others.length ? (
            <section className="bb-card p-5">
              <h3 className="bb-h3 mb-4 text-xl">{cycles.length ? "Autres romans" : "Bibliographie"}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {others.map((book) => {
                  const entry = statusByBook.get(book.id);
                  const progress = entry?.readingPeriods[0]?.entries[0];
                  return (
                    <div key={book.id} className="flex min-w-0 flex-col gap-1">
                      <Link href={`/books/${book.id}`} className="block transition hover:-translate-y-1">
                        <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster" iconSize={14} />
                      </Link>
                      {entry?.status === ReadingStatus.READING && progress?.percentage != null ? (
                        <div className="bb-track mt-1 h-1"><div className="h-full rounded-full bg-mint" style={{ width: `${progress.percentage}%` }} /></div>
                      ) : null}
                      <Link href={`/books/${book.id}`} className="line-clamp-2 pt-1 font-display text-sm font-semibold text-paper hover:text-mint">{book.title}</Link>
                      <span className="text-[11px] text-muted">{year(book.publishedDate)}</span>
                      <div className="pt-1">{bookStatus(book.id)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <details className="group rounded border border-dashed border-line bg-panel">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <Search size={16} aria-hidden className="text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-paper">Un livre ou une édition manque ?</span>
                <span className="block text-[11px] text-muted">Cherche dans Google Books et Open Library pour l&apos;ajouter.</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-mint">
                Chercher d&apos;autres éditions
                <ChevronDown size={14} aria-hidden className="transition group-open:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-line p-4">
              <AuthorExternalEditions authorSlug={authorSlug} />
            </div>
          </details>
        </div>

        <aside className="flex flex-col gap-4">
          <h2 className="bb-h2">Ce qu&apos;en disent les lecteurs</h2>
          {recentReviews.length ? (
            recentReviews.map((review) => (
              <article key={review.id} className="bb-card flex flex-col gap-2 p-4">
                <Link href={`/books/${review.bookId}#avis`} className="bb-label text-mint hover:underline">{review.bookTitle}</Link>
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${review.userId}`}><Avatar name={review.user.name} image={review.user.image} size={34} /></Link>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${review.userId}`} className="font-display text-[15px] font-semibold text-paper hover:text-mint">{review.user.name ?? "Lecteur BooksBox"}</Link>
                      <StarRating value={review.rating} />
                    </p>
                    <p className="mt-1.5 line-clamp-4 text-[13px] leading-relaxed text-paper">{review.spoiler ? "Cet avis contient des spoilers." : review.body}</p>
                    <p className="mt-2 flex items-center gap-3 text-[11px] font-bold text-muted"><ReviewLikeButton reviewId={review.id} count={review._count.reactions} initiallyLiked={review.reactions.length > 0} isSignedIn={Boolean(viewerId)} size={13} />{plural(review._count.comments, "commentaire")}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="bb-card-flat p-5 text-sm text-muted">Aucun avis sur les livres de cet auteur pour le moment.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
