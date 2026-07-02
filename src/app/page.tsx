import Link from "next/link";
import { getServerSession } from "next-auth";
import { BookOpenCheck, MessageSquareText, Search, ThumbsUp } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { getFriendActivity, getTopReviewsLast24Hours } from "@/server/services/feed";
import { getTrendingBooks } from "@/server/services/trending";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BookCard } from "@/components/books/BookCard";
import { CoverShelf } from "@/components/books/CoverShelf";
import { ActivityFeedPreview } from "@/components/activity/ActivityFeedPreview";
import { StarRating } from "@/components/reviews/StarRating";
import { getRecommendations } from "@/server/services/recommendations";
import { RecommendationShelf } from "@/components/books/RecommendationShelf";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const [trending, activity, topReviews, recommendations] = await Promise.all([
    getTrendingBooks(),
    session?.user?.id ? getFriendActivity(session.user.id) : Promise.resolve([]),
    getTopReviewsLast24Hours(),
    session?.user?.id ? getRecommendations(session.user.id, 8) : Promise.resolve([])
  ]);
  const activityItems = activity.map((item) =>
    item.type === "review"
      ? {
          id: item.id,
          type: "review" as const,
          userId: item.review.userId,
          userName: item.review.user.name ?? "Un lecteur",
          userImage: item.review.user.image,
          bookId: item.review.bookId,
          bookTitle: item.review.book.title,
          detail: `a publie une review ${item.review.rating}/5`
        }
      : {
          id: item.id,
          type: "library" as const,
          userId: item.entry.userId,
          userName: item.entry.user.name ?? "Un lecteur",
          userImage: item.entry.user.image,
          bookId: item.entry.bookId,
          bookTitle: item.entry.book.title,
          detail: `a marque ce livre en ${item.entry.status}`
        }
  );

  return (
    <div className="min-w-0 overflow-hidden">
      <section className="relative overflow-hidden rounded border border-line bg-gradient-to-br from-panel via-night to-ink p-4 shadow-poster sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-amber to-coral" />
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-10">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <div className="mb-3 inline-flex rounded bg-mint/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-mint sm:mb-4 sm:text-xs sm:tracking-[0.18em]">
                BooksBox
              </div>
              <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-normal text-paper sm:text-5xl xl:text-6xl">
                Ton carnet de lecture devient un mur de couvertures vivant.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:mt-5 sm:text-base sm:leading-7">
                Recherche, note, classe et decouvre les lectures de ton cercle avec une interface sombre,
                dense et visuelle pensee pour le bureau.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
              <Link href="/search" className="inline-flex items-center justify-center gap-2 rounded bg-mint px-5 py-3 font-black text-ink transition hover:bg-lime">
                <Search size={18} />
                J'ai fini un livre
              </Link>
              <Link href="/trending" className="inline-flex items-center justify-center gap-2 rounded border border-line bg-ink/35 px-5 py-3 font-bold text-muted transition hover:text-paper">
                Voir tendance
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <CoverShelf />
            <div className="mt-4 rounded border border-line bg-ink/55 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded bg-mint text-ink">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-paper">Boucle critique</div>
                  <div className="text-xs text-muted">{"Recherche -> Lu -> Note -> Review"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {session?.user?.id ? (
        <section className="mt-8 min-w-0 overflow-hidden">
          <SectionHeader eyebrow="Pour toi" title="Recommandations personnalisées" description="Des livres choisis à partir de tes goûts et de lecteurs proches." />
          <RecommendationShelf initialItems={recommendations} />
        </section>
      ) : null}

      <section className="mt-8 min-w-0 overflow-hidden">
        <SectionHeader
          eyebrow="Rayon actif"
          title="Tendances"
          description="Livres les plus populaires de la communaute ces derniers jours, à decouvrir ou à ajouter a ta liste."
        />
        {trending.length ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {trending.slice(0, 8).map((book) => (
              <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="Hot" showScore={false} variant="poster" />
            ))}
          </div>
        ) : (
          <div className="rounded border border-line bg-panel/65 p-5">
            <CoverShelf />
          </div>
        )}
      </section>

      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="min-w-0 overflow-hidden">
          <SectionHeader
            eyebrow="Social"
            title="Activite des amis"
            description={session ? "Les reviews et statuts des personnes suivies." : "Connecte-toi pour voir ton feed personnalise."}
          />
          <div className="min-w-0 space-y-3 overflow-hidden">
            {activityItems.length ? (
              <ActivityFeedPreview items={activityItems} />
            ) : (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Aucun evenement pour l'instant. Le feed prendra vie des que tu suis des lecteurs.
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden">
          <SectionHeader
            eyebrow="Reviews"
            title="Top reviews 24h"
            description="Les avis qui ont le plus fait reagir la communaute depuis hier."
          />
          <div className="min-w-0 space-y-4 overflow-hidden">
            {topReviews.length ? (
              topReviews.map((review) => (
                <article key={review.id} className="w-full min-w-0 max-w-full overflow-hidden rounded border border-line bg-panel/82 p-4 shadow-poster">
                  <div className="flex min-w-0 gap-3">
                    <Link href={`/books/${review.bookId}`} className="cover-sheen h-20 w-14 shrink-0 overflow-hidden rounded border border-line bg-panelSoft min-[360px]:h-24 min-[360px]:w-16">
                      {review.book.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={review.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted">
                          <BookOpenCheck size={18} />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/books/${review.bookId}`} className="line-clamp-1 text-sm font-black text-paper transition hover:text-mint">
                        {review.book.title}
                      </Link>
                      <Link href={`/profile/${review.userId}`} className="mt-1 block text-xs font-bold text-muted transition hover:text-paper">
                        par {review.user.name ?? "Lecteur BooksBox"}
                      </Link>
                      <div className="mt-2">
                        <StarRating value={review.rating} />
                      </div>
                    </div>
                  </div>
                  {review.body ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                      {review.spoiler ? "Cette review contient des spoilers." : review.body}
                    </p>
                  ) : null}
                  <div className="mt-3 flex min-w-0 flex-wrap gap-4 border-t border-line pt-3 text-xs font-bold text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp size={13} />
                      {review.reactions.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareText size={13} />
                      {review.comments.length}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Aucune review publiee ces dernieres 24h. La prochaine review active prendra cette place.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
