"use client";

import Link from "next/link";
import { useState } from "react";
import { ThumbsUp } from "lucide-react";

type ReviewLikeButtonProps = {
  reviewId: string;
  count: number;
  initiallyLiked?: boolean;
  isSignedIn: boolean;
  size?: number;
};

// Like d'un avis utilisable partout où un avis est affiché (accueil, communauté, profil, auteur…).
export function ReviewLikeButton({ reviewId, count, initiallyLiked = false, isSignedIn, size = 14 }: ReviewLikeButtonProps) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [total, setTotal] = useState(count);
  const [busy, setBusy] = useState(false);
  const className = `inline-flex items-center gap-1 font-bold transition hover:text-mint ${liked ? "text-mint" : "text-muted"}`;

  if (!isSignedIn) {
    return (
      <Link href="/login" className={className} aria-label="Connecte-toi pour aimer cet avis">
        <ThumbsUp size={size} aria-hidden />
        {total}
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/reviews/${reviewId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "LIKE" })
    });
    setBusy(false);
    if (!response.ok) return;
    const payload = await response.json();
    setLiked(Boolean(payload.liked));
    setTotal((current) => Math.max(0, current + (payload.liked ? 1 : -1)));
  }

  return (
    <button type="button" onClick={() => void toggle()} disabled={busy} aria-pressed={liked} aria-label={liked ? "Retirer mon like" : "Aimer cet avis"} className={className}>
      <ThumbsUp size={size} aria-hidden fill={liked ? "currentColor" : "none"} />
      {total}
    </button>
  );
}
