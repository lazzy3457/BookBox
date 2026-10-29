"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";

type GroupLikeButtonProps = {
  endpoint: string;
  count: number;
  initiallyLiked: boolean;
  canLike: boolean;
  size?: number;
};

// Like d'une discussion ou d'un message de groupe (réservé aux membres).
export function GroupLikeButton({ endpoint, count, initiallyLiked, canLike, size = 15 }: GroupLikeButtonProps) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [total, setTotal] = useState(count);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!canLike) return;
    setBusy(true);
    const response = await fetch(endpoint, { method: "POST" });
    setBusy(false);
    if (!response.ok) return;
    const payload = await response.json();
    setLiked(Boolean(payload.liked));
    setTotal((current) => Math.max(0, current + (payload.liked ? 1 : -1)));
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy || !canLike}
      aria-pressed={liked}
      title={canLike ? undefined : "Rejoins le groupe pour réagir"}
      className={`inline-flex items-center gap-1 font-bold transition hover:text-mint disabled:hover:text-muted ${liked ? "text-mint" : "text-muted"}`}
    >
      <ThumbsUp size={size} aria-hidden fill={liked ? "currentColor" : "none"} />
      {total}
    </button>
  );
}
