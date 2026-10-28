import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { ArrowRight, Flame, Minus, Quote, Sparkles, TrendingDown, TrendingUp, Trophy, UserRoundCheck, UsersRound } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getTrendingRanking, TREND_POINTS, trendReason, type RankedBook, type TrendPeriod } from "@/server/services/trendingRanking";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { AddToReadButton } from "@/components/library/AddToReadButton";
import { genreLabel } from "@/lib/genres";
import { daysAgo, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tendances"
};

type TrendingPageProps = {
  searchParams: Promise<{ tab?: string; periode?: string; genre?: string; tout?: string }>;
};

const periodLabels: Record<TrendPeriod, string> = { week: "Cette semaine", month: "Ce mois", year: "Cette année" };
const podiumTitle: Record<TrendPeriod, string> = { week: "Le podium de la semaine", month: "Le podium du mois", year: "Le podium de l'année" };
const filterGenres = ["science-fiction", "fantasy", "classique", "litterature", "policier", "romance"];

function href(params: Record<string, string | undefined>) {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const value = query.toString();
  return value ? `/trending?${value}` : "/trending";
}

function signal(book: RankedBook) {
  if (book.movement === null) return `Entre dans le top · ${plural(book.tally.added + book.tally.finished, "nouveau lecteur", "nouveaux lecteurs")}`;
  if (book.tally.reviews >= Math.max(book.tally.added, book.tally.finished)) return `${plural(book.tally.reviews, "review")} sur la période`;
  if (book.tally.reading) return `${plural(book.tally.reading, "lecteur")} en cours de lecture`;
  if (book.tally.finished > book.tally.added) return `${plural(book.tally.finished, "lecteur")} l'${book.tally.finished > 1 ? "ont" : "a"} terminé`;
  return `${plural(book.tally.added, "lecteur")} l'${book.tally.added > 1 ? "ont" : "a"} ajouté`;
}

function Movement({ book }: { book: RankedBook }) {
  if (book.movement === null) return <span className="rounded-full bg-mint/10 px-1.5 py-0.5 text-[10px] font-extrabold text-mint">Nouveau</span>;
  if (book.movement > 0) return <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#4f7a4f]"><TrendingUp size={12} aria-hidden />{book.movement}</span>;
  if (book.movement < 0) return <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-coral"><TrendingDown size={12} aria-hidden />{Math.abs(book.movement)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-muted"><Minus size={12} aria-hidden />=</span>;
}

export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
  const viewerId = session?.user?.id ?? null;
  const period: TrendPeriod = params.periode === "mois" ? "month" : params.periode === "annee" ? "year" : "week";
  const periodParam = period === "month" ? "mois" : period === "year" ? "annee" : undefined;
  const tab = params.tab === "pour-toi" && viewerId ? "pour-toi" : "communaute";
  const genre = filterGenres.includes(params.genre ?? "") ? params.genre! : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-paper sm:text-[40px]">Tendances</h1>
          <p className="mt-1 text-sm text-muted">Le top des livres qui circulent dans la communauté</p>
        </div>
        <div className="flex w-fit rounded-full border border-line bg-panel p-1" role="group" aria-label="Période">
          {(Object.keys(periodLabels) as TrendPeriod[]).map((value) => {
            const param = value === "month" ? "mois" : value === "year" ? "annee" : undefined;
            return (
              <Link
                key={value}
                href={href({ tab: tab === "pour-toi" ? "pour-toi" : undefined, periode: param, genre: genre ?? undefined })}
                aria-current={period === value ? "true" : undefined}
                className={`rounded-full px-3.5 py-2 text-[13px] font-extrabold transition ${period === value ? "bg-mint text-ink" : "text-paper hover:text-mint"}`}
              >
                {periodLabels[value]}
              </Link>
            );
          })}
        </div>
      </div>

      <nav aria-label="Vue des tendances" className="flex gap-7 border-b border-line">
        <Link href={href({ periode: periodParam })} aria-current={tab === "communaute" ? "page" : undefined} className={`bb-tab ${tab === "communaute" ? "bb-tab-active font-extrabold text-paper" : ""}`}>
          Toute la communauté
        </Link>
        <Link
          href={viewerId ? href({ tab: "pour-toi", periode: periodParam }) : "/login?callbackUrl=/trending?tab=pour-toi"}
          aria-current={tab === "pour-toi" ? "page" : undefined}
          className={`bb-tab ${tab === "pour-toi" ? "bb-tab-active font-extrabold text-paper" : ""}`}
        >
          Pour toi
        </Link>
      </nav>

      {tab === "pour-toi" && viewerId ? (
        <ForYou viewerId={viewerId} period={period} />
      ) : (
        <Community period={period} periodParam={periodParam} genre={genre} showAll={params.tout === "1"} viewerId={viewerId} />
      )}
    </div>
  );
}

async function Community({ period, periodParam, genre, showAll, viewerId }: { period: TrendPeriod; periodParam?: string; genre: string | null; showAll: boolean; viewerId: string | null }) {
  const { books, risers } = await getTrendingRanking({ period, genre, limit: showAll ? 20 : 10 });
  const owned = viewerId
    ? new Set((await prisma.userBook.findMany({ where: { userId: viewerId, bookId: { in: books.map((book) => book.id) } }, select: { bookId: true } })).map((entry) => entry.bookId))
    : new Set<string>();
  const podium = books.slice(0, 3);
  const rest = books.slice(3);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href={href({ periode: periodParam })} className={`bb-chip ${!genre ? "bb-chip-active" : ""}`}>Tous les genres</Link>
        {filterGenres.map((slug) => (
          <Link key={slug} href={href({ periode: periodParam, genre: slug })} className={`bb-chip ${genre === slug ? "bb-chip-active" : ""}`}>{genreLabel(slug)}</Link>
        ))}
      </div>

      {!books.length ? (
        <div className="bb-card-flat p-6 text-sm text-muted">Pas encore assez d&apos;activité sur cette période. Les tendances apparaîtront dès que la communauté lira et notera des livres.</div>
      ) : (
        <>
          <section className="bb-card p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2.5 bb-h3 text-xl">
              <Trophy size={20} aria-hidden className="text-amber" />
              {podiumTitle[period]}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {podium.map((book) => (
                <div key={book.id} className="flex gap-4">
                  <div className="flex w-[115px] shrink-0 flex-col gap-1.5">
                    <Link href={`/books/${book.id}`} className="relative block">
                      <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[172px] w-[115px] shadow-poster" iconSize={0} />
                      <span className="absolute bottom-0 left-2 font-display text-6xl font-semibold leading-none text-ink drop-shadow">{book.rank}</span>
                    </Link>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-bold text-coral">
                      <Flame size={11} aria-hidden />+{book.tally.added + book.tally.finished} lecteurs
                    </span>
                    <Link href={`/books/${book.id}`} className="truncate font-display text-[15px] font-semibold text-paper hover:text-mint">{book.title}</Link>
                    <span className="truncate text-[11px] text-muted">{book.authors[0]}</span>
                  </div>
                  <div className="flex min-w-0 flex-col justify-end gap-2 pb-6">
                    <p className="bb-label text-muted">Pourquoi ce livre ?</p>
                    <p className="text-[13px] leading-relaxed text-paper">{trendReason(book)}</p>
                    <div><AddToReadButton bookId={book.id} isSignedIn={Boolean(viewerId)} initiallyAdded={owned.has(book.id)} variant="primary" /></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-w-0 flex-col gap-3">
              {rest.map((book) => (
                <article key={book.id} className="bb-card-flat flex items-center gap-4 p-3 pr-4">
                  <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                    <span className="font-display text-[26px] font-semibold leading-none text-paper">{book.rank}</span>
                    <Movement book={book} />
                  </div>
                  <Link href={`/books/${book.id}`}><BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[84px] w-14" iconSize={0} /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/books/${book.id}`} className="block truncate font-display text-lg font-semibold text-paper hover:text-mint">{book.title}</Link>
                    <p className="truncate text-[13px] text-muted">{[book.authors[0], book.genres[0] ? genreLabel(book.genres[0]) : null].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold text-coral"><Flame size={12} aria-hidden />{signal(book)}</p>
                  </div>
                  {book.averageRating ? (
                    <div className="hidden flex-col items-end gap-0.5 sm:flex">
                      <StarRating value={Math.round(book.averageRating)} />
                      <span className="text-[11px] text-muted">{book.averageRating.toFixed(1)} · {plural(book.ratingCount, "note")}</span>
                    </div>
                  ) : null}
                  <AddToReadButton bookId={book.id} isSignedIn={Boolean(viewerId)} initiallyAdded={owned.has(book.id)} />
                </article>
              ))}
              {!showAll && books.length >= 10 ? (
                <Link href={href({ periode: periodParam, genre: genre ?? undefined, tout: "1" })} className="inline-flex w-fit items-center gap-1.5 pt-2 text-[13px] font-extrabold text-mint hover:underline">
                  Voir la suite du classement (11 à 20) <ArrowRight size={14} aria-hidden />
                </Link>
              ) : null}
            </div>

            <aside className="flex flex-col gap-5">
              <section className="bb-card-flat flex flex-col gap-3 p-5">
                <h2 className="bb-h3">Comment on calcule ?</h2>
                <p className="text-xs text-muted">Chaque livre gagne des points sur la période choisie :</p>
                {[
                  [TREND_POINTS.review, "par review publiée"],
                  [TREND_POINTS.finished, "par lecteur qui l'a terminé"],
                  [TREND_POINTS.added, "par lecteur qui l'a commencé ou ajouté"],
                  [TREND_POINTS.reaction, "par réaction sur ses reviews"]
                ].map(([points, label]) => (
                  <p key={label} className="flex items-center gap-3 text-[13px] text-paper">
                    <span className="w-9 rounded-full bg-mint/[0.08] py-0.5 text-center text-xs font-extrabold text-mint">+{points}</span>
                    {label}
                  </p>
                ))}
              </section>
              {risers.length ? (
                <section className="bb-card-flat flex flex-col gap-3 p-5">
                  <h2 className="flex items-center gap-2 bb-h3"><TrendingUp size={17} aria-hidden className="text-[#4f7a4f]" />Monte en flèche</h2>
                  {risers.map((book) => (
                    <Link key={book.id} href={`/books/${book.id}`} className="group flex items-center gap-4 py-1">
                      <span className="w-9 text-center font-display text-xl font-semibold text-[#4f7a4f]">+{book.movement}</span>
                      <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[54px] w-9 rounded-lg" iconSize={0} />
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-semibold text-paper group-hover:text-mint">{book.title}</span>
                        <span className="block text-[11px] text-muted">{book.rank}ᵉ · gagne {plural(book.movement ?? 0, "place")}</span>
                      </span>
                    </Link>
                  ))}
                </section>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </>
  );
}

async function ForYou({ viewerId, period }: { viewerId: string; period: TrendPeriod }) {
  const blocked = await getBlockedUserIds(viewerId);
  const [follows, myLibrary, ranking] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId, followingId: { notIn: blocked } }, select: { followingId: true } }),
    prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true, book: { select: { genres: true } } } }),
    getTrendingRanking({ period, limit: 50 })
  ]);
  const followingIds = follows.map((follow) => follow.followingId);
  const mine = new Set(myLibrary.map((entry) => entry.bookId));

  const genreTally = new Map<string, number>();
  myLibrary.forEach((entry) => entry.book.genres.forEach((slug) => genreTally.set(slug, (genreTally.get(slug) ?? 0) + 1)));
  const favoriteGenres = [...genreTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([slug]) => slug);

  const genreRanks = new Map<string, number>();
  const genrePicks = ranking.books
    .filter((book) => !mine.has(book.id))
    .flatMap((book) => {
      const slug = favoriteGenres.find((value) => book.genres.includes(value));
      if (!slug) return [];
      const rank = (genreRanks.get(slug) ?? 0) + 1;
      genreRanks.set(slug, rank);
      return [{ book, badge: `n°${rank} en ${genreLabel(slug)}` }];
    })
    .slice(0, 6);

  const [circleEntries, lookalikeRows] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId: { in: followingIds }, status: { in: [ReadingStatus.READING, ReadingStatus.READ] }, user: { suspendedAt: null } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { userId: true, status: true, user: { select: { name: true, image: true } }, book: { select: { id: true, title: true, thumbnailUrl: true } } }
    }),
    mine.size
      ? prisma.userBook.groupBy({
          by: ["userId"],
          where: { bookId: { in: [...mine] }, userId: { notIn: [viewerId, ...blocked] }, user: { suspendedAt: null } },
          _count: { bookId: true },
          having: { bookId: { _count: { gte: 3 } } },
          orderBy: { _count: { bookId: "desc" } },
          take: 30
        })
      : Promise.resolve([])
  ]);

  const byBook = new Map<string, { book: (typeof circleEntries)[number]["book"]; readers: typeof circleEntries }>();
  circleEntries.forEach((entry) => {
    const group = byBook.get(entry.book.id) ?? { book: entry.book, readers: [] };
    group.readers.push(entry);
    byBook.set(entry.book.id, group);
  });
  const circleBooks = [...byBook.values()].sort((a, b) => b.readers.length - a.readers.length).slice(0, 2);
  const quotes = circleBooks.length
    ? await prisma.review.findMany({
        where: { bookId: { in: circleBooks.map((group) => group.book.id) }, userId: { in: followingIds }, hiddenAt: null, spoiler: false, body: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { bookId: true, body: true, rating: true, user: { select: { name: true } } }
      })
    : [];

  const since = daysAgo(30);
  const lookalikeIds = lookalikeRows.map((row) => row.userId);
  const lookalikeReads = lookalikeIds.length
    ? await prisma.userBook.findMany({
        where: { userId: { in: lookalikeIds }, bookId: { notIn: [...mine] }, status: { in: [ReadingStatus.READ, ReadingStatus.READING] }, updatedAt: { gte: since } },
        select: { book: { select: { id: true, title: true, authors: true, thumbnailUrl: true } }, user: { select: { name: true } } },
        take: 300
      })
    : [];
  const lookalikeBooks = new Map<string, { book: (typeof lookalikeReads)[number]["book"]; names: string[] }>();
  lookalikeReads.forEach((entry) => {
    const group = lookalikeBooks.get(entry.book.id) ?? { book: entry.book, names: [] };
    group.names.push(entry.user.name?.split(" ")[0] ?? "Un lecteur");
    lookalikeBooks.set(entry.book.id, group);
  });
  const lookalikePicks = [...lookalikeBooks.values()].sort((a, b) => b.names.length - a.names.length).slice(0, 6);

  return (
    <div className="flex flex-col gap-9">
      <ForYouSection icon={UsersRound} title="Dans ton cercle" caption="Les livres que les gens que tu suis lisent en ce moment">
        {circleBooks.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {circleBooks.map((group) => {
              const finished = group.readers.filter((entry) => entry.status === ReadingStatus.READ).length;
              const reading = group.readers.length - finished;
              const quote = quotes.find((item) => item.bookId === group.book.id);
              return (
                <article key={group.book.id} className="bb-card flex gap-4 p-4">
                  <Link href={`/books/${group.book.id}`}><BookCover title={group.book.title} thumbnailUrl={group.book.thumbnailUrl} className="h-[104px] w-[70px]" iconSize={14} /></Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Link href={`/books/${group.book.id}`} className="bb-h3 hover:text-mint">{group.book.title}</Link>
                    <div className="flex items-center gap-2">
                      <span className="flex -space-x-1.5">
                        {group.readers.slice(0, 3).map((entry) => <Avatar key={entry.userId} name={entry.user.name} image={entry.user.image} size={24} className="border-2 border-panel" />)}
                      </span>
                      <span className="text-xs font-bold text-mint">
                        {[plural(group.readers.length, "ami"), reading ? `${reading} le ${reading > 1 ? "lisent" : "lit"}` : null, finished ? `${finished} l'${finished > 1 ? "ont" : "a"} terminé` : null].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    {quote?.body ? (
                      <p className="flex gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs italic text-paper">
                        <Quote size={13} aria-hidden className="mt-0.5 shrink-0 text-coral" />
                        « {quote.body.length > 110 ? `${quote.body.slice(0, 110)}…` : quote.body} » — {quote.user.name ?? "Un ami"}, {quote.rating}/5
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="bb-card-flat p-5 text-sm text-muted">Suis des lecteurs pour voir ce qui circule dans ton cercle. <Link href="/commu?tab=suggestions" className="font-extrabold text-mint">Trouver des lecteurs</Link></p>
        )}
      </ForYouSection>

      <ForYouSection
        icon={Sparkles}
        title="Dans tes genres préférés"
        caption={favoriteGenres.length ? `${favoriteGenres.map(genreLabel).join(" et ")}, ${favoriteGenres.length > 1 ? "tes deux genres les plus lus" : "ton genre le plus lu"}` : "Ajoute des livres pour qu'on connaisse tes goûts"}
        action={favoriteGenres[0] ? <Link href={`/trending?genre=${favoriteGenres[0]}`} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-mint hover:underline">Tout voir <ArrowRight size={14} aria-hidden /></Link> : null}
      >
        <PickGrid picks={genrePicks.map((pick) => ({ ...pick.book, badge: pick.badge, tone: "coral" as const }))} />
      </ForYouSection>

      <ForYouSection icon={UserRoundCheck} title="Chez les lecteurs qui te ressemblent" caption="Lus récemment par des lecteurs qui ont 3 livres ou plus en commun avec toi">
        <PickGrid
          picks={lookalikePicks.map((pick) => ({
            ...pick.book,
            badge: pick.names.length > 1 ? `${pick.names[0]} et ${plural(pick.names.length - 1, "autre")}` : pick.names[0],
            tone: "green" as const
          }))}
        />
      </ForYouSection>
    </div>
  );
}

function ForYouSection({ icon: Icon, title, caption, action, children }: { icon: typeof Sparkles; title: string; caption: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/[0.08] text-mint"><Icon size={18} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="bb-h2">{title}</h2>
          <p className="text-xs text-muted">{caption}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PickGrid({ picks }: { picks: Array<{ id: string; title: string; authors: string[]; thumbnailUrl: string | null; badge: string; tone: "coral" | "green" }> }) {
  if (!picks.length) return <p className="bb-card-flat p-5 text-sm text-muted">Rien à te proposer pour l&apos;instant : reviens quand la communauté aura un peu plus lu.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {picks.map((book) => (
        <Link key={book.id} href={`/books/${book.id}`} className="group flex min-w-0 flex-col gap-1.5">
          <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster transition group-hover:-translate-y-1" iconSize={0} />
          <span className={`mt-1 inline-flex w-fit max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-bold ${book.tone === "green" ? "bg-[#4f7a4f]/10 text-[#4f7a4f]" : "bg-coral/10 text-coral"}`}>
            {book.badge}
          </span>
          <span className="truncate font-display text-[15px] font-semibold text-paper">{book.title}</span>
          <span className="-mt-1 truncate text-xs text-muted">{book.authors[0]}</span>
        </Link>
      ))}
    </div>
  );
}
