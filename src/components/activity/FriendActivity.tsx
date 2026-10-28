import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ReviewLikeButton } from "@/components/reviews/ReviewLikeButton";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { Avatar } from "@/components/ui/Avatar";

export type FriendActivityItem = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  action: string;
  bookId: string;
  bookTitle: string;
  bookThumbnail?: string | null;
  meta: string;
  review?: {
    id: string;
    liked: boolean;
    rating: number;
    excerpt: string | null;
    likes: number;
    comments: number;
  };
};

// Activité d'un ami : « qui + quoi + quel livre ». Les avis montrent note, extrait et réactions ; les statuts restent compacts.
export function FriendActivity({ item }: { item: FriendActivityItem }) {
  const isReview = Boolean(item.review);

  return (
    <article className={`bb-card-flat flex gap-4 px-5 ${isReview ? "items-start py-4" : "items-center py-3"}`}>
      <Link href={`/profile/${item.userId}`} aria-label={`Profil de ${item.userName}`}>
        <Avatar name={item.userName} image={item.userImage} size={40} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
          <Link href={`/profile/${item.userId}`} className="font-extrabold text-paper hover:text-mint">{item.userName}</Link>
          <span className="text-muted">{item.action}</span>
          <Link href={`/books/${item.bookId}`} className="font-bold text-mint hover:underline">{item.bookTitle}</Link>
        </p>
        <p className="text-xs text-muted">{item.meta}</p>
        {item.review ? (
          <>
            <StarRating value={item.review.rating} />
            {item.review.excerpt ? <p className="text-sm italic leading-relaxed text-paper">« {item.review.excerpt} »</p> : null}
            <div className="flex gap-3.5 pt-1 text-xs font-bold text-muted">
              <ReviewLikeButton reviewId={item.review.id} count={item.review.likes} initiallyLiked={item.review.liked} isSignedIn />
              <Link href={`/books/${item.bookId}#avis`} className="inline-flex items-center gap-1 hover:text-mint"><MessageCircle size={14} aria-hidden />{item.review.comments}</Link>
            </div>
          </>
        ) : null}
      </div>
      <Link href={`/books/${item.bookId}`} aria-label={item.bookTitle}>
        <BookCover
          title={item.bookTitle}
          thumbnailUrl={item.bookThumbnail}
          className={isReview ? "h-[108px] w-[72px]" : "h-[60px] w-10"}
          iconSize={14}
        />
      </Link>
    </article>
  );
}
