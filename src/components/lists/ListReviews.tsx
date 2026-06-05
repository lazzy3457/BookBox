"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ReviewCard } from "@/components/reviews/ReviewCard";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  spoiler: boolean;
  userName: string;
  reactionsCount: number;
  bookTitle: string;
  bookId: string;
  comments: Array<{
    id: string;
    body: string;
    userName: string;
    createdAt: string;
  }>;
};

const INITIAL_COUNT = 2;

export function ListReviews({ reviews }: { reviews: Review[] }) {
  const [visible, setVisible] = useState(INITIAL_COUNT);
  const shown = reviews.slice(0, visible);
  const remaining = reviews.length - visible;

  return (
    <div className="space-y-4">
      {shown.map((review) => (
        <div key={review.id}>
          {/* Lien vers le livre au-dessus de chaque review */}
          <Link
            href={`/books/${review.bookId}`}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-black text-muted transition hover:text-mint"
          >
            <span className="text-muted/50">↳</span>
            {review.bookTitle}
          </Link>
          <ReviewCard review={review} />
        </div>
      ))}

      {remaining > 0 && (
        <button
          onClick={() => setVisible((v) => v + INITIAL_COUNT)}
          className="flex w-full items-center justify-center gap-2 rounded border border-line bg-panel/60 py-3 text-sm font-black text-muted transition hover:border-mint/40 hover:text-mint"
        >
          <ChevronDown size={15} />
          Voir {Math.min(remaining, INITIAL_COUNT)} review{Math.min(remaining, INITIAL_COUNT) !== 1 ? "s" : ""} de plus
          <span className="text-muted/50">({remaining} restante{remaining !== 1 ? "s" : ""})</span>
        </button>
      )}
    </div>
  );
}