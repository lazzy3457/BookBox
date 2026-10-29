import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { ArrowRight, MessageCircle, MessageSquareReply, Quote, Search } from "lucide-react";
import { ReviewLikeButton } from "@/components/reviews/ReviewLikeButton";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getReaderCards, getSuggestedReaderIds } from "@/server/services/community";
import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { FollowButton } from "@/components/community/FollowButton";
import { ReaderGrid } from "@/components/community/ReaderGrid";
import { GroupsTab } from "@/components/groups/GroupsTab";
import { getGroupDirectory } from "@/server/services/groupDirectory";
import { daysAgo, plural, timeAgo } from "@/lib/format";
import { genreLabel } from "@/lib/genres";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communauté"
};

type Tab = "cercle" | "groupes" | "suggestions" | "abonnements" | "abonnes";

type CommunityPageProps = {
  searchParams: Promise<{ tab?: string; q?: string }>;
};

const circleCaption: Record<ReadingStatus, string> = {
  READING: "lit",
  READ: "a fini",
  TO_READ: "veut lire",
  ABANDONED: "a laissé"
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
  const viewerId = session?.user?.id ?? null;

  if (!viewerId) {
    const recent = await prisma.user.findMany({ where: { suspendedAt: null }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true } });
    const readers = await getReaderCards(null, recent.map((user) => user.id), new Set());
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="bb-page-title">Communauté</h1>
          <p className="mt-1 text-[13px] text-muted sm:text-sm">Des lecteurs, leurs lectures du moment et leurs avis.</p>
        </div>
        <div className="bb-card flex flex-col items-start gap-3 p-5 sm:p-6">
          <p className="bb-h3">Rejoins le cercle</p>
          <p className="text-sm text-muted">Crée un compte pour suivre des lecteurs et voir ce qu&apos;ils lisent.</p>
          <div className="flex gap-2">
            <Link href="/signup" className="bb-btn-primary">Créer mon compte</Link>
            <Link href="/login?callbackUrl=/commu" className="bb-btn-outline">Connexion</Link>
          </div>
        </div>
        {params.tab === "groupes" ? (
          <GroupsTab {...(await getGroupDirectory(null))} isSignedIn={false} />
        ) : (
          <ReaderGrid readers={readers} canFollow={false} variant="following" />
        )}
      </div>
    );
  }

  const tab: Tab = (["cercle", "groupes", "suggestions", "abonnements", "abonnes"] as const).includes(params.tab as Tab) ? (params.tab as Tab) : params.q ? "suggestions" : "cercle";
  const blocked = await getBlockedUserIds(viewerId);
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { notIn: blocked }, following: { suspendedAt: null } },
      select: { followingId: true }
    }),
    prisma.follow.findMany({
      where: { followingId: viewerId, followerId: { notIn: blocked }, follower: { suspendedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { followerId: true }
    })
  ]);
  const followingIds = new Set(following.map((follow) => follow.followingId));
  const [suggestedIds, myGroupCount] = await Promise.all([
    getSuggestedReaderIds(viewerId, followingIds),
    prisma.groupMember.count({ where: { userId: viewerId } })
  ]);

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "cercle", label: "Mon cercle" },
    { id: "groupes", label: "Groupes", count: myGroupCount },
    { id: "suggestions", label: "Suggestions", count: suggestedIds.length },
    { id: "abonnements", label: "Abonnements", count: followingIds.size },
    { id: "abonnes", label: "Abonnés", count: followers.length }
  ];

  let content: React.ReactNode;
  if (tab === "groupes") {
    content = <GroupsTab {...(await getGroupDirectory(viewerId))} isSignedIn />;
  } else if (tab === "suggestions") {
    content = <ReaderGrid readers={await getReaderCards(viewerId, suggestedIds, followingIds)} canFollow variant="suggestions" initialQuery={params.q ?? ""} />;
  } else if (tab === "abonnements") {
    content = <ReaderGrid readers={await getReaderCards(viewerId, [...followingIds], followingIds)} canFollow variant="following" />;
  } else if (tab === "abonnes") {
    content = <ReaderGrid readers={await getReaderCards(viewerId, followers.map((follow) => follow.followerId), followingIds)} canFollow variant="followers" />;
  } else {
    content = <CircleTab viewerId={viewerId} followingIds={[...followingIds]} suggestedIds={suggestedIds.slice(0, 4)} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="bb-page-title">Communauté</h1>
          <p className="mt-1 text-[13px] text-muted sm:text-sm">Tu suis {plural(followingIds.size, "lecteur")} · {followers.length} te suivent</p>
        </div>
        <form action="/commu" className="flex w-full items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 sm:w-80">
          <input type="hidden" name="tab" value="suggestions" />
          <Search size={15} aria-hidden className="text-muted" />
          <label htmlFor="find-reader" className="sr-only">Trouver un lecteur</label>
          <input id="find-reader" name="q" defaultValue={params.q ?? ""} placeholder="Trouver un lecteur" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-muted" />
        </form>
      </div>

      <nav aria-label="Sections de la communauté" className="bb-scroll-row gap-5 border-b border-line sm:gap-7">
        {tabs.map((item) => (
          <Link key={item.id} href={item.id === "cercle" ? "/commu" : `/commu?tab=${item.id}`} aria-current={tab === item.id ? "page" : undefined} className={`bb-tab sm:text-[15px] ${tab === item.id ? "bb-tab-active" : ""}`}>
            <span className={tab === item.id ? "font-extrabold text-paper" : ""}>{item.label}</span>
            {item.count != null ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tab === item.id ? "bg-mint text-ink" : "bg-panelSoft text-muted"}`}>{item.count}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {content}
    </div>
  );
}

async function CircleTab({ viewerId, followingIds, suggestedIds }: { viewerId: string; followingIds: string[]; suggestedIds: string[] }) {
  const weekAgo = daysAgo(7);
  const twoDaysAgo = daysAgo(2);
  const [circle, circleBooks, discussions, lookalikes, talkedAbout] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: followingIds } },
      select: {
        id: true,
        name: true,
        image: true,
        library: { orderBy: { updatedAt: "desc" }, take: 1, select: { status: true, updatedAt: true, book: { select: { title: true } } } }
      }
    }),
    prisma.userBook.findMany({
      where: { userId: { in: followingIds }, status: { in: [ReadingStatus.READING, ReadingStatus.READ] } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { userId: true, status: true, user: { select: { name: true, image: true } }, book: { select: { id: true, title: true, thumbnailUrl: true } } }
    }),
    prisma.review.findMany({
      where: { userId: { in: followingIds }, hiddenAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        user: { select: { id: true, name: true, image: true } },
        book: { select: { id: true, title: true, thumbnailUrl: true } },
        reactions: { select: { userId: true, kind: true } },
        comments: {
          where: { hiddenAt: null, deletedAt: null, user: { suspendedAt: null } },
          orderBy: { createdAt: "asc" },
          select: { id: true, body: true, user: { select: { name: true, image: true } } }
        }
      }
    }),
    getReaderCards(viewerId, suggestedIds, new Set()),
    prisma.book.findMany({
      where: { reviews: { some: { createdAt: { gte: weekAgo }, hiddenAt: null } } },
      take: 30,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        reviews: { where: { createdAt: { gte: weekAgo }, hiddenAt: null }, select: { _count: { select: { comments: true } } } }
      }
    })
  ]);

  const circleSorted = circle.sort((a, b) => (b.library[0]?.updatedAt.getTime() ?? 0) - (a.library[0]?.updatedAt.getTime() ?? 0));

  const byBook = new Map<string, { book: (typeof circleBooks)[number]["book"]; readers: typeof circleBooks }>();
  circleBooks.forEach((entry) => {
    const group = byBook.get(entry.book.id) ?? { book: entry.book, readers: [] };
    group.readers.push(entry);
    byBook.set(entry.book.id, group);
  });
  const sharedBooks = [...byBook.values()].sort((a, b) => b.readers.length - a.readers.length).slice(0, 3);
  const quotes = sharedBooks.length
    ? await prisma.review.findMany({
        where: { bookId: { in: sharedBooks.map((group) => group.book.id) }, userId: { in: followingIds }, hiddenAt: null, spoiler: false, body: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { bookId: true, body: true, rating: true, user: { select: { name: true } } }
      })
    : [];

  const hottest = talkedAbout
    .map((book) => ({ ...book, discussions: book.reviews.reduce((total, review) => total + 1 + review._count.comments, 0) }))
    .sort((a, b) => b.discussions - a.discussions)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section className="bb-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="bb-h3">Ton cercle</h2>
          {followingIds.length ? (
            <Link href="/commu?tab=abonnements" className="text-[13px] font-extrabold text-mint hover:underline">Voir mes {plural(followingIds.length, "abonnement")}</Link>
          ) : null}
        </div>
        {circleSorted.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1 sm:gap-4">
            {circleSorted.slice(0, 12).map((member) => {
              const last = member.library[0];
              const recent = last && last.updatedAt > twoDaysAgo;
              return (
                <Link key={member.id} href={`/profile/${member.id}`} className="flex w-[76px] shrink-0 flex-col items-center gap-1 text-center sm:w-[88px]">
                  <span className={`rounded-full p-[3px] ${recent ? "ring-2 ring-coral" : ""}`}>
                    <Avatar name={member.name} image={member.image} size={54} className="border-0 font-display text-xl" />
                  </span>
                  <span className="w-full truncate text-xs font-extrabold text-paper">{member.name?.split(" ")[0] ?? "Lecteur"}</span>
                  {last ? <span className="line-clamp-2 text-[11px] text-muted">{circleCaption[last.status]} {last.book.title}</span> : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Ton cercle est vide. <Link href="/commu?tab=suggestions" className="font-extrabold text-mint hover:underline">Découvre des lecteurs qui te ressemblent</Link>.
          </p>
        )}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="bb-h2">Ce que lit ton cercle</h2>
            {sharedBooks.length ? (
              sharedBooks.map((group) => {
                const finished = group.readers.filter((entry) => entry.status === ReadingStatus.READ).length;
                const reading = group.readers.length - finished;
                const quote = quotes.find((item) => item.bookId === group.book.id);
                const summary =
                  finished === group.readers.length
                    ? group.readers.length > 1 ? `${group.readers.length} amis · tous l'ont terminé` : "1 ami · l'a terminé"
                    : [`${plural(group.readers.length, "ami")}`, reading ? `${reading} le ${reading > 1 ? "lisent" : "lit"}` : null, finished ? `${finished} l'${finished > 1 ? "ont" : "a"} terminé` : null].filter(Boolean).join(" · ");
                return (
                  <article key={group.book.id} className="bb-card flex gap-3 p-3.5 sm:gap-4 sm:p-4">
                    <Link href={`/books/${group.book.id}`}>
                      <BookCover title={group.book.title} thumbnailUrl={group.book.thumbnailUrl} className="h-[84px] w-14 sm:h-[104px] sm:w-[70px]" iconSize={14} />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Link href={`/books/${group.book.id}`} className="bb-h3 hover:text-mint">{group.book.title}</Link>
                      <div className="flex items-center gap-2">
                        <span className="flex -space-x-1.5">
                          {group.readers.slice(0, 3).map((entry) => (
                            <Avatar key={entry.userId} name={entry.user.name} image={entry.user.image} size={24} className="border-2 border-panel" />
                          ))}
                        </span>
                        <span className="text-[13px] font-bold text-mint">{summary}</span>
                      </div>
                      {quote?.body ? (
                        <p className="flex gap-2 rounded-xl bg-ink px-3 py-2.5 text-[13px] italic text-paper">
                          <Quote size={14} aria-hidden className="mt-0.5 shrink-0 text-coral" />
                          <span>« {quote.body.length > 120 ? `${quote.body.slice(0, 120)}…` : quote.body} » — {quote.user.name ?? "Un ami"}, {quote.rating}/5</span>
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="bb-card-flat p-5 text-sm text-muted">Quand ton cercle lira, ses livres apparaîtront ici.</p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="bb-h2">Discussions de ton cercle</h2>
            {discussions.length ? (
              discussions.map((review) => {
                const firstComment = review.comments[0];
                return (
                  <article key={review.id} className="bb-card flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
                    <div className="flex gap-3 sm:gap-4">
                      <Link href={`/books/${review.book.id}`}>
                        <BookCover title={review.book.title} thumbnailUrl={review.book.thumbnailUrl} className="h-20 w-[54px]" iconSize={0} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="flex flex-wrap items-center gap-2 text-xs">
                          <Avatar name={review.user.name} image={review.user.image} size={22} />
                          <Link href={`/profile/${review.user.id}`} className="text-[13px] font-extrabold text-paper hover:text-mint">{review.user.name ?? "Un lecteur"}</Link>
                          <span className="text-muted">a noté · {timeAgo(review.createdAt)}</span>
                        </p>
                        <Link href={`/books/${review.book.id}`} className="bb-h3 hover:text-mint">{review.book.title}</Link>
                        <StarRating value={review.rating} />
                        {review.body ? (
                          <p className="line-clamp-4 text-sm italic leading-relaxed text-paper sm:line-clamp-none sm:text-[15px]">
                            {review.spoiler ? "Cet avis contient des spoilers." : `« ${review.body.length > 260 ? `${review.body.slice(0, 260)}…` : review.body} »`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {firstComment ? (
                      <div className="flex gap-3 rounded-xl bg-ink px-4 py-3">
                        <Avatar name={firstComment.user.name} image={firstComment.user.image} size={24} />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-paper">{firstComment.user.name ?? "Un lecteur"}</p>
                          <p className="line-clamp-2 text-[13px] text-paper">{firstComment.body}</p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-4 text-[13px] font-bold text-muted">
                      <ReviewLikeButton reviewId={review.id} count={review.reactions.length} initiallyLiked={review.reactions.some((reaction) => reaction.userId === viewerId && reaction.kind === "LIKE")} isSignedIn size={15} />
                      <Link href={`/books/${review.book.id}#avis`} className="inline-flex items-center gap-1.5 hover:text-mint"><MessageCircle size={15} aria-hidden />{plural(review.comments.length, "réponse")}</Link>
                      <Link href={`/books/${review.book.id}#avis`} className="bb-btn-soft ml-auto px-3 py-1.5 text-xs">
                        <MessageSquareReply size={14} aria-hidden />
                        Répondre
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="bb-card-flat p-5 text-sm text-muted">Pas encore de discussion dans ton cercle.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="bb-card flex flex-col gap-4 p-4 sm:p-5">
            <div>
              <h2 className="bb-h3">Lecteurs qui te ressemblent</h2>
              <p className="text-xs text-muted">D&apos;après les livres que vous avez en commun</p>
            </div>
            {lookalikes.length ? (
              lookalikes.map((reader) => (
                <div key={reader.id} className="flex items-center gap-3">
                  <Link href={`/profile/${reader.id}`}><Avatar name={reader.name} image={reader.image} size={38} /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${reader.id}`} className="block truncate text-sm font-extrabold text-paper hover:text-mint">{reader.name}</Link>
                    <p className="truncate text-xs text-muted">
                      {[reader.commonCount ? `${plural(reader.commonCount, "livre")} en commun` : null, reader.genres[0] ? genreLabel(reader.genres[0]) : null].filter(Boolean).join(" · ") || "Nouveau lecteur"}
                    </p>
                  </div>
                  <FollowButton userId={reader.id} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Ajoute des livres à ta bibliothèque pour trouver des lecteurs proches.</p>
            )}
            <Link href="/commu?tab=suggestions" className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-mint hover:underline">
              Découvrir d&apos;autres lecteurs <ArrowRight size={14} aria-hidden />
            </Link>
          </section>

          {hottest.length ? (
            <section className="bb-card hidden flex-col gap-2 p-5 lg:flex">
              <h2 className="bb-h3 pb-2">Livres dont on parle</h2>
              {hottest.map((book, index) => (
                <Link key={book.id} href={`/books/${book.id}`} className="group flex items-center gap-4 py-2">
                  <span className="w-8 text-center font-display text-[30px] font-semibold text-mint">{index + 1}</span>
                  <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[52px] w-9 rounded-lg" iconSize={0} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[15px] font-semibold text-paper group-hover:text-mint">{book.title}</span>
                    <span className="block text-xs text-muted">{plural(book.discussions, "discussion")} cette semaine</span>
                  </span>
                </Link>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
