import Link from "next/link";
import { ReadingStatus } from "@prisma/client";
import { ArrowRight, Eye, Flame, ListPlus } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getEarnedBadges, getProgressSummary, syncBadges } from "@/server/services/progression";
import { levelProgress } from "@/lib/progression";
import { genreLabel } from "@/lib/genres";
import { plural } from "@/lib/format";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { BadgeMedal, tierTextClass } from "@/components/progression/BadgeMedal";
import { BadgeShowcase } from "@/components/progression/BadgeShowcase";
import { ListCard } from "@/components/lists/ListCard";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { FollowButton } from "@/components/community/FollowButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { BlockButton } from "@/components/community/BlockButton";
import { formatBadgeCount } from "@/lib/progression";
import { PublicReadingEntries } from "@/components/library/PublicReadingEntries";
import { ReviewLikeButton } from "@/components/reviews/ReviewLikeButton";

export type ProfileTab = "apercu" | "annee" | "avis" | "listes" | "badges";

type ProfileViewProps = {
  userId: string;
  viewerId: string | null;
  tab: ProfileTab;
  basePath: string;
  isFollowing?: boolean;
  // Aperçu de son propre profil public : aucune commande affichée.
  preview?: boolean;
};

const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export async function ProfileView({ userId, viewerId, tab, basePath, isFollowing = false, preview = false }: ProfileViewProps) {
  const isOwn = viewerId === userId;
  await syncBadges(userId);

  const [user, libraryCount, reviewCount, followerCount, followingCount, library, reviews, lists, badges, stats, publicEntries, progress] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId, suspendedAt: null } }),
    prisma.userBook.count({ where: { userId } }),
    prisma.review.count({ where: { userId, hiddenAt: null } }),
    prisma.follow.count({ where: { followingId: userId, follower: { suspendedAt: null } } }),
    prisma.follow.count({ where: { followerId: userId, following: { suspendedAt: null } } }),
    prisma.userBook.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        book: { select: { id: true, title: true, authors: true, thumbnailUrl: true, pageCount: true, genres: true } },
        readingPeriods: { orderBy: { createdAt: "desc" }, take: 1, include: { entries: { orderBy: { entryDate: "desc" }, take: 1 } } }
      }
    }),
    prisma.review.findMany({
      where: { userId, hiddenAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        book: { select: { id: true, title: true, thumbnailUrl: true } },
        reactions: { select: { userId: true, kind: true } },
        comments: { where: { hiddenAt: null, user: { suspendedAt: null } }, select: { id: true } }
      }
    }),
    prisma.bookList.findMany({
      where: { userId, ...(isOwn ? {} : { isPublic: true }) },
      orderBy: { updatedAt: "desc" },
      include: {
        entries: { orderBy: { order: "asc" }, take: 5, include: { book: { select: { thumbnailUrl: true, title: true } } } },
        _count: { select: { entries: true } }
      }
    }),
    getEarnedBadges(userId),
    prisma.userStats.findUnique({ where: { userId }, select: { xpTotal: true } }),
    prisma.readingEntry.findMany({
      where: { isPublic: true, period: { userBook: { userId } } },
      include: { period: { include: { userBook: { include: { book: true } } } } },
      orderBy: { entryDate: 'desc' },
      take: 6
    }),
    isOwn ? getProgressSummary(userId) : Promise.resolve(null)
  ]);

  if (!user) return null;

  const level = levelProgress(stats?.xpTotal ?? 0);
  const year = new Date().getFullYear();
  const ratingByBook = new Map(reviews.map((review) => [review.bookId, review.rating]));
  const finishedAt = (entry: (typeof library)[number]) => entry.readingPeriods[0]?.finishedAt ?? entry.updatedAt;
  const readThisYear = library.filter((entry) => entry.status === ReadingStatus.READ && finishedAt(entry).getFullYear() === year);
  const pages = readThisYear.reduce((total, entry) => total + (entry.book.pageCount ?? 0), 0);
  const genreTally = new Map<string, number>();
  readThisYear.forEach((entry) => entry.book.genres.forEach((genre) => genreTally.set(genre, (genreTally.get(genre) ?? 0) + 1)));
  const favoriteGenre = [...genreTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const yearRatings = readThisYear.map((entry) => ratingByBook.get(entry.bookId)).filter((rating): rating is number => rating != null);
  const yearAverage = yearRatings.length ? yearRatings.reduce((total, rating) => total + rating, 0) / yearRatings.length : null;
  const bookOfYear = [...readThisYear].sort((a, b) => (ratingByBook.get(b.bookId) ?? 0) - (ratingByBook.get(a.bookId) ?? 0) || finishedAt(b).getTime() - finishedAt(a).getTime())[0];
  const current = library.find((entry) => entry.status === ReadingStatus.READING);
  const currentEntry = current?.readingPeriods[0]?.entries[0];
  const currentPercent = currentEntry?.percentage ?? (currentEntry?.page && current?.book.pageCount ? Math.round((currentEntry.page / current.book.pageCount) * 100) : null);
  const favorites = library.filter((entry) => entry.isFavorite).slice(0, 4);
  const name = user.name ?? user.username ?? "Lecteur BooksBox";
  const possessive = isOwn ? "Mon" : "Son";

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: "apercu", label: "Aperçu" },
    { id: "annee", label: `${possessive} année` },
    { id: "avis", label: "Avis", count: reviewCount },
    { id: "listes", label: "Listes", count: lists.length },
    { id: "badges", label: "Badges", count: badges.length }
  ];
  const tabHref = (id: ProfileTab) => (id === "apercu" ? basePath : `${basePath}?tab=${id}`);

  const yearCard = (
    <section className="grid gap-6 rounded bg-gradient-to-r from-mint to-[#9a4a3e] p-7 text-ink sm:p-8 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="flex flex-col gap-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f0b48f]">{isOwn ? "Ton" : "Son"} année de lecture</p>
        <h2 className="font-display text-4xl font-semibold">{year} en livres</h2>
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            [String(readThisYear.length), readThisYear.length > 1 ? "livres lus" : "livre lu"],
            [pages.toLocaleString("fr-FR"), "pages"],
            [favoriteGenre ? genreLabel(favoriteGenre) : "—", "genre préféré"],
            [yearAverage ? yearAverage.toFixed(1).replace(".", ",") : "—", "note moyenne"]
          ].map(([value, label]) => (
            <div key={label}>
              <dd className="font-display text-[32px] font-semibold leading-tight">{value}</dd>
              <dt className="text-xs text-ink/75">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
      {bookOfYear ? (
        <Link href={`/books/${bookOfYear.bookId}`} className="flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f0b48f]">{isOwn ? "Ton" : "Son"} livre de l&apos;année</p>
          <BookCover title={bookOfYear.book.title} thumbnailUrl={bookOfYear.book.thumbnailUrl} className="h-[160px] w-[106px] border border-ink/30" iconSize={0} />
          <span className="font-display text-base font-semibold">{bookOfYear.book.title}</span>
          <span className="text-[11px] text-ink/75">
            {[ratingByBook.get(bookOfYear.bookId) ? `noté ${ratingByBook.get(bookOfYear.bookId)}/5` : null, `lu en ${monthNames[finishedAt(bookOfYear).getMonth()].toLowerCase()}`].filter(Boolean).join(" · ")}
          </span>
        </Link>
      ) : null}
    </section>
  );

  const reviewItem = (review: (typeof reviews)[number]) => (
    <article key={review.id} className="bb-card flex gap-4 p-4">
      <Link href={`/books/${review.bookId}#avis`}><BookCover title={review.book.title} thumbnailUrl={review.book.thumbnailUrl} className="h-20 w-14" iconSize={0} /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/books/${review.bookId}#avis`} className="block font-display text-[15px] font-semibold text-paper hover:text-mint">{review.book.title}</Link>
        <StarRating value={review.rating} />
        {review.body ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{review.spoiler ? "Avis marqué comme spoiler." : review.body}</p> : null}
        <p className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-muted">
          <ReviewLikeButton reviewId={review.id} count={review.reactions.length} initiallyLiked={review.reactions.some((reaction) => reaction.userId === viewerId && reaction.kind === "LIKE")} isSignedIn={Boolean(viewerId) && !isOwn} size={13} />
          <Link href={`/books/${review.bookId}#avis`} className="hover:text-mint">{plural(review.comments.length, "commentaire")}</Link>
        </p>
      </div>
    </article>
  );

  let content: React.ReactNode;
  if (tab === "annee") {
    const months = Array.from({ length: 12 }, (_, month) => ({
      month,
      books: readThisYear.filter((entry) => finishedAt(entry).getMonth() === month)
    }))
      .filter((group) => group.books.length)
      .reverse();
    content = (
      <div className="flex flex-col gap-8">
        {yearCard}
        <section className="flex flex-col gap-4">
          <h2 className="bb-h2">Mois par mois</h2>
          {months.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {months.map((group) => (
                <div key={group.month} className="bb-card flex flex-col gap-3 p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="bb-h3 text-base">{monthNames[group.month]}</h3>
                    <span className="text-[11px] text-muted">{plural(group.books.length, "livre")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.books.map((entry) => (
                      <Link key={entry.id} href={`/books/${entry.bookId}`} title={entry.book.title}>
                        <BookCover title={entry.book.title} thumbnailUrl={entry.book.thumbnailUrl} className="h-14 w-10 rounded-lg" iconSize={0} />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="bb-card-flat p-5 text-sm text-muted">Aucun livre terminé cette année pour l&apos;instant.</p>
          )}
        </section>
        {badges.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="bb-h2">Étapes franchies</h2>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {badges.slice(0, 6).map((badge) => (
                <div key={badge.slug} className="flex items-center gap-3">
                  <BadgeMedal icon={badge.icon} tier={badge.tier} size="sm" label={`${badge.name}, palier ${badge.tierName}`} />
                  <div>
                    <p className="font-display text-sm font-semibold text-paper">{badge.name}</p>
                    <p className="text-[11px] font-bold">
                      <span className={tierTextClass(badge.tier)}>{badge.tierName}</span>
                      <span className="text-muted"> · {formatBadgeCount(badge, badge.threshold)} · en {monthNames[badge.earnedAt.getMonth()].toLowerCase()}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  } else if (tab === "avis") {
    content = reviews.length ? <div className="grid gap-4 lg:grid-cols-2">{reviews.map(reviewItem)}</div> : <p className="bb-card-flat p-6 text-sm text-muted">Aucun avis publié pour le moment.</p>;
  } else if (tab === "listes") {
    content = (
      <div className="flex flex-col gap-4">
        {isOwn ? <Link href="/lists/new" className="bb-btn-primary w-fit"><ListPlus size={15} aria-hidden />Nouvelle liste</Link> : null}
        {lists.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{lists.map((list) => <ListCard key={list.id} list={list} />)}</div>
        ) : (
          <p className="bb-card-flat p-6 text-sm text-muted">Aucune liste pour le moment.</p>
        )}
      </div>
    );
  } else if (tab === "badges") {
    content = (
      <div className="flex flex-col gap-4">
        <BadgeShowcase badges={badges} emptyMessage={isOwn ? "Aucun badge pour le moment. Termine un livre ou publie un avis pour obtenir le premier." : "Aucun badge pour le moment."} />
        {isOwn ? <Link href="/parcours" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-mint hover:underline">Voir mon parcours et tous les badges <ArrowRight size={14} aria-hidden /></Link> : null}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-8">
        {yearCard}
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-8">
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="bb-h2">{isOwn ? "Mes" : "Ses"} {favorites.length > 1 ? `${favorites.length} livres préférés` : "livres préférés"}</h2>
                {isOwn ? <Link href="/library" className="text-[13px] font-extrabold text-mint hover:underline">Modifier</Link> : null}
              </div>
              {favorites.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {favorites.map((entry) => (
                    <Link key={entry.id} href={`/books/${entry.bookId}`} className="group flex min-w-0 flex-col gap-1">
                      <BookCover title={entry.book.title} thumbnailUrl={entry.book.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster transition group-hover:-translate-y-1" iconSize={16} />
                      <span className="truncate pt-2 font-display text-sm font-semibold text-paper">{entry.book.title}</span>
                      <span className="truncate text-[11px] text-muted">{entry.book.authors[0]}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="bb-card-flat p-5 text-sm text-muted">{isOwn ? "Marque tes coups de cœur depuis une fiche livre pour les afficher ici." : "Aucun coup de cœur affiché."}</p>
              )}
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="bb-h2">{isOwn ? "Mes" : "Ses"} derniers avis</h2>
              {reviews.length ? reviews.slice(0, 2).map(reviewItem) : <p className="bb-card-flat p-5 text-sm text-muted">Aucun avis publié pour le moment.</p>}
            </section>
            <PublicReadingEntries entries={publicEntries} />
          </div>
          <aside className="flex flex-col gap-5">
            <section className="bb-card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="bb-h3">Badges</h2>
                {badges.length ? <Link href={tabHref("badges")} className="text-xs font-extrabold text-mint hover:underline">Voir les {badges.length}</Link> : null}
              </div>
              {badges.length ? (
                badges.slice(0, 3).map((badge) => (
                  <div key={badge.slug} className="flex items-center gap-3">
                    <BadgeMedal icon={badge.icon} tier={badge.tier} size="sm" label={`${badge.name}, palier ${badge.tierName}`} />
                    <div>
                      <p className="font-display text-sm font-semibold text-paper">{badge.name}</p>
                      <p className="text-[11px] font-bold"><span className={tierTextClass(badge.tier)}>{badge.tierName}</span><span className="text-muted"> · {formatBadgeCount(badge, badge.threshold)}</span></p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Pas encore de badge.</p>
              )}
            </section>
            <section className="bb-card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="bb-h3">{isOwn ? "Mes" : "Ses"} listes</h2>
                {lists.length ? <Link href={tabHref("listes")} className="text-xs font-extrabold text-mint hover:underline">Voir les {lists.length}</Link> : null}
              </div>
              {lists.length ? (
                lists.slice(0, 3).map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`} className="group flex items-center gap-3">
                    <span className="flex -space-x-4">
                      {(list.entries.length ? list.entries : [{ book: { title: list.title, thumbnailUrl: null } }]).slice(0, 3).map((entry, index) => (
                        <BookCover key={index} title={entry.book.title} thumbnailUrl={entry.book.thumbnailUrl} className="h-11 w-8 rounded-md border-2 border-panel" iconSize={0} />
                      ))}
                    </span>
                    <span>
                      <span className="block font-display text-sm font-semibold text-paper group-hover:text-mint">{list.title}</span>
                      <span className="block text-[11px] text-muted">{plural(list._count.entries, "livre")}</span>
                    </span>
                  </Link>
                ))
              ) : isOwn ? (
                <Link href="/lists/new" className="text-[13px] font-extrabold text-mint hover:underline">+ Créer une liste</Link>
              ) : (
                <p className="text-sm text-muted">Aucune liste publique.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {preview ? (
        <div role="status" className="sticky top-20 z-20 flex flex-wrap items-center gap-3 rounded bg-paper px-5 py-3 text-ink shadow-poster">
          <Eye size={16} aria-hidden />
          <span className="text-[13px] font-extrabold">Tu vois ton profil comme les autres lecteurs.</span>
          <Link href={tab === "apercu" ? "/profile" : `/profile?tab=${tab}`} className="bb-btn ml-auto bg-mint px-4 py-2 text-ink hover:bg-lime">Revenir à mon profil</Link>
        </div>
      ) : null}
      <section className="bb-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-mint to-coral sm:h-[120px]" />
        <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:px-8">
          <div className="-mt-10 shrink-0 sm:-mt-12">
            <Avatar name={name} image={user.image} size={116} className="border-4 border-panel font-display text-5xl font-semibold" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:pt-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="font-display text-4xl font-semibold text-paper">{name}</h1>
              {user.username ? <span className="text-sm text-muted">@{user.username}</span> : null}
            </div>
            {user.bio ? <p className="text-sm text-paper">{user.bio}</p> : null}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-[13px] font-extrabold text-paper">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-[11px] text-ink">{level.level}</span>
                {level.title}
              </span>
              {progress ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-paper">
                  <Flame size={15} aria-hidden className={progress.streak ? "text-coral" : "text-muted"} />
                  {plural(progress.streak, "jour")} de série
                </span>
              ) : null}
              <span aria-hidden className="hidden h-8 w-px bg-line sm:block" />
              <dl className="flex gap-6">
                {[
                  [libraryCount, "livres"],
                  [reviewCount, "avis"],
                  [followerCount, "abonnés"],
                  [followingCount, "abonnements"]
                ].map(([value, label]) => (
                  <div key={label}>
                    <dd className="font-display text-xl font-semibold leading-tight text-paper">{value}</dd>
                    <dt className="text-[11px] text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end sm:pt-4">
            {isOwn ? (
              <>
                <EditProfileButton user={{ name: user.name, bio: user.bio, image: user.image }} />
                <Link href={`/profile/${user.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted hover:text-paper">
                  <Eye size={13} aria-hidden />
                  Voir comme les autres
                </Link>
              </>
            ) : preview ? null : viewerId ? (
              <div className="flex flex-wrap items-center gap-2">
                <FollowButton userId={user.id} initiallyFollowing={isFollowing} size="block" />
                <ReportButton targetType="USER" targetId={user.id} label="Signaler le profil" />
                <BlockButton userId={user.id} userName={name} />
              </div>
            ) : (
              <Link href="/login" className="bb-btn-primary">Suivre</Link>
            )}
            {current ? (
              <Link href={`/books/${current.bookId}`} className="flex items-center gap-3 rounded-xl bg-ink px-3 py-2">
                <BookCover title={current.book.title} thumbnailUrl={current.book.thumbnailUrl} className="h-9 w-6 rounded-md" iconSize={0} />
                <span>
                  <span className="bb-label block text-muted">Lit en ce moment</span>
                  <span className="block max-w-[180px] truncate font-display text-sm font-semibold text-paper">
                    {current.book.title}{currentPercent != null ? ` · ${currentPercent} %` : ""}
                  </span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4 border-b border-line">
        <nav aria-label="Sections du profil" className="flex gap-6 overflow-x-auto">
          {tabs.map((item) => (
            <Link key={item.id} href={tabHref(item.id)} aria-current={tab === item.id ? "page" : undefined} className={`bb-tab text-[15px] ${tab === item.id ? "bb-tab-active font-extrabold text-paper" : ""}`}>
              {item.label}
              {item.count != null ? <span className="rounded-full bg-panelSoft px-2 py-0.5 text-[11px] font-extrabold text-muted">{item.count}</span> : null}
            </Link>
          ))}
        </nav>
        {isOwn ? (
          <Link href="/library" className="hidden shrink-0 items-center gap-1.5 pb-3 text-[13px] font-extrabold text-mint hover:underline sm:inline-flex">
            Ma bibliothèque ({libraryCount}) <ArrowRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>

      {content}
    </div>
  );
}

export function parseProfileTab(value: string | undefined): ProfileTab {
  return (["apercu", "annee", "avis", "listes", "badges"] as const).includes(value as ProfileTab) ? (value as ProfileTab) : "apercu";
}
