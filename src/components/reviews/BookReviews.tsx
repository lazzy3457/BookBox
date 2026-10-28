"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Heart, PencilLine } from "lucide-react";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { StarRating } from "@/components/reviews/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { ReviewLikeButton } from "@/components/reviews/ReviewLikeButton";
import { useUserPreferences } from "@/components/settings/UserPreferencesProvider";

type ReviewView = React.ComponentProps<typeof ReviewCard>["review"];

type BookReviewsProps = {
  bookId: string;
  isSignedIn: boolean;
  hasUserReview: boolean;
  averageRating: number | null;
  featured: (ReviewView & { commentsCount: number; liked: boolean }) | null;
  reviews: ReviewView[];
};

const INITIAL_VISIBLE = 3;

function summary(average: number) {
  if (average >= 4.5) return "Un coup de cœur pour presque tous";
  if (average >= 4) return "La plupart des lecteurs l'ont adoré";
  if (average >= 3) return "Les lecteurs l'ont plutôt aimé";
  if (average >= 2) return "Les avis sont partagés";
  return "Il a déçu la plupart des lecteurs";
}

export function BookReviews({ bookId, isSignedIn, hasUserReview, averageRating, featured, reviews }: BookReviewsProps) {
  const { hideSpoilers } = useUserPreferences();
  const [composing, setComposing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const total = reviews.length + (featured ? 1 : 0);
  const visible = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE);
  const featuredHidden = featured?.spoiler && hideSpoilers;

  return (
    <section id="avis" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="bb-h2">Ce qu&apos;en pensent les lecteurs</h2>
        {isSignedIn && !hasUserReview ? (
          <button type="button" onClick={() => setComposing((value) => !value)} className="bb-btn-primary">
            <PencilLine size={15} aria-hidden />
            Écrire mon avis
          </button>
        ) : !isSignedIn ? (
          <Link href={`/login?callbackUrl=/books/${bookId}`} className="bb-btn-primary">
            <PencilLine size={15} aria-hidden />
            Écrire mon avis
          </Link>
        ) : null}
      </div>

      {averageRating ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <StarRating value={Math.round(averageRating)} />
          <span className="font-extrabold text-paper">{summary(averageRating)}</span>
          <span className="text-muted">· {averageRating.toFixed(1).replace(".", ",")} sur {total} note{total > 1 ? "s" : ""}</span>
        </p>
      ) : null}

      {composing ? <ReviewComposer bookId={bookId} hasUserReview={hasUserReview} /> : null}

      {featured ? (
        <article className="flex flex-col gap-4 rounded border border-line bg-ink p-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-extrabold text-mint">
            <Heart size={12} aria-hidden fill="currentColor" />
            L&apos;avis qui a le plus touché
          </span>
          <blockquote className="font-display text-xl italic leading-relaxed text-paper">
            {featuredHidden ? "Cet avis contient des spoilers." : `« ${featured.body} »`}
          </blockquote>
          <div className="flex flex-wrap items-center gap-3">
            {featured.userId ? (
              <Link href={`/profile/${featured.userId}`} className="flex items-center gap-2 text-sm font-extrabold text-paper hover:text-mint">
                <Avatar name={featured.userName} image={featured.userImage} size={30} />
                {featured.userName}
              </Link>
            ) : null}
            <StarRating value={featured.rating} />
            <span className="ml-auto flex items-center gap-3 text-xs text-muted">
              <ReviewLikeButton reviewId={featured.id} count={featured.reactionsCount} initiallyLiked={featured.liked} isSignedIn={isSignedIn} />
              {featured.commentsCount} réponse{featured.commentsCount > 1 ? "s" : ""}
            </span>
          </div>
        </article>
      ) : null}

      {reviews.length ? (
        <>
          {featured ? <h3 className="bb-h3 text-base">Les autres avis</h3> : null}
          <div className="flex flex-col gap-4">
            {visible.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
          {reviews.length > INITIAL_VISIBLE && !showAll ? (
            <button type="button" onClick={() => setShowAll(true)} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-mint hover:underline">
              Voir les {total} avis <ArrowRight size={14} aria-hidden />
            </button>
          ) : null}
        </>
      ) : !featured ? (
        <div className="bb-card-flat p-6 text-sm text-muted">Aucun avis pour ce livre. Le premier donnera le ton.</div>
      ) : null}
    </section>
  );
}
