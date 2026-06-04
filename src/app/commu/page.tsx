import Link from "next/link";
import { getServerSession } from "next-auth";
import { BookOpen, MessageSquareText, UsersRound } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getTrendingBooks } from "@/server/services/trending";
import { BookCard } from "@/components/books/BookCard";
import { FollowButton } from "@/components/community/FollowButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StarRating } from "@/components/reviews/StarRating";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const [readers, recentReviews, trendingBooks, following] = await Promise.all([
    prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        _count: {
          select: {
            library: true,
            reviews: true,
            followers: true
          }
        }
      }
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: true,
        book: true,
        reactions: true,
        comments: true
      }
    }),
    getTrendingBooks(),
    currentUserId
      ? prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true }
        })
      : Promise.resolve([])
  ]);

  const followingIds = new Set(following.map((follow) => follow.followingId));
  const communityStats = [
    { label: "Lecteurs", value: readers.length, Icon: UsersRound },
    { label: "Reviews recentes", value: recentReviews.length, Icon: MessageSquareText },
    { label: "Livres actifs", value: trendingBooks.length, Icon: BookOpen }
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Social"
        title="Commu"
        description="Un hub pour trouver des lecteurs, lire les reviews recentes et voir les livres qui circulent dans la communaute."
      />

      <section className="mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink shadow-poster">
        <div className="h-1 bg-gradient-to-r from-mint via-sky to-coral" />
        <div className="grid gap-6 p-6 xl:grid-cols-3">
          {communityStats.map(({ label, value, Icon }) => (
            <div key={label} className="rounded border border-line bg-ink/45 p-5">
              <div className="grid h-11 w-11 place-items-center rounded bg-mint/12 text-mint">
                <Icon size={20} />
              </div>
              <div className="mt-4 text-sm text-muted">{label}</div>
              <div className="mt-1 text-3xl font-black text-paper">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <section>
          <SectionHeader eyebrow="Lecteurs" title="A suivre" />
          <div className="grid gap-4 xl:grid-cols-2">
            {readers.map((reader) => (
              <article
                key={reader.id}
                className="rounded border border-line bg-panel/80 p-5 shadow-poster transition hover:border-mint/60 hover:bg-panelSoft"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/profile/${reader.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded border border-line bg-ink text-xl font-black text-mint">
                      {(reader.name ?? reader.username ?? "B").slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-black text-paper">{reader.name ?? reader.username ?? "Lecteur BooksBox"}</h2>
                      <p className="mt-1 truncate text-xs text-muted">
                        {reader.username ? `@${reader.username}` : reader.email ?? "Lecteur BooksBox"}
                      </p>
                    </div>
                  </Link>
                  {currentUserId ? (
                    <div className="shrink-0">
                      <FollowButton userId={reader.id} initiallyFollowing={followingIds.has(reader.id)} />
                    </div>
                  ) : null}
                </div>
                <Link
                  href={`/profile/${reader.id}`}
                  className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-muted"
                  aria-label={`Voir le profil de ${reader.name ?? reader.username ?? "ce lecteur"}`}
                >
                  <div className="rounded bg-ink/55 px-2 py-2">{reader._count.library} livres</div>
                  <div className="rounded bg-ink/55 px-2 py-2">{reader._count.reviews} reviews</div>
                  <div className="rounded bg-ink/55 px-2 py-2">{reader._count.followers} followers</div>
                </Link>
              </article>
            ))}
          </div>
          {!readers.length ? (
            <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
              Aucun lecteur a afficher pour le moment.
            </div>
          ) : null}
        </section>

        <aside>
          <SectionHeader eyebrow="Livres" title="Qui tournent" />
          <div className="space-y-4">
            {trendingBooks.slice(0, 4).map((book) => (
              <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="Commu" compact />
            ))}
            {!trendingBooks.length ? (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Les livres actifs apparaitront avec les premiers ajouts et reviews.
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="mt-9">
        <SectionHeader eyebrow="Reviews" title="Dernieres discussions" />
        <div className="grid gap-4 xl:grid-cols-2">
          {recentReviews.map((review) => (
            <article key={review.id} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
              <div className="flex gap-4">
                <Link href={`/books/${review.bookId}`} className="h-28 w-20 shrink-0 overflow-hidden rounded border border-line bg-panelSoft">
                  {review.book.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0">
                  <Link href={`/books/${review.bookId}`} className="line-clamp-1 text-sm font-black text-paper">
                    {review.book.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">par {review.user.name ?? "Lecteur BooksBox"}</p>
                  <div className="mt-2">
                    <StarRating value={review.rating} />
                  </div>
                  {review.body ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                      {review.spoiler ? "Review marquee comme spoiler." : review.body}
                    </p>
                  ) : null}
                  <div className="mt-3 text-xs font-bold text-muted">
                    {review.reactions.length} likes - {review.comments.length} commentaires
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
