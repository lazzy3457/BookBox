"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Lock, Quote } from "lucide-react";

export type QuoteView = {
  id: string;
  text: string;
  page: number | null;
  author: { id: string; name: string };
  isPublic: boolean;
  isMine: boolean;
  likes: number;
  likedByMe: boolean;
  book?: { id: string; title: string };
};

// Cœur d'une citation, utilisé partout où une citation s'affiche (fiche livre, profil, journal…).
export function QuoteLikeButton({ entryId, count, initiallyLiked, isSignedIn, size = 14 }: { entryId: string; count: number; initiallyLiked: boolean; isSignedIn: boolean; size?: number }) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [likes, setLikes] = useState(count);
  const [busy, setBusy] = useState(false);

  if (!isSignedIn) {
    return (
      <Link href="/login" aria-label="Connecte-toi pour aimer cette citation" className="inline-flex items-center gap-1 font-bold text-muted hover:text-mint">
        <Heart size={size} aria-hidden />
        {likes}
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/reading-journal/${entryId}/likes`, { method: "POST" });
    setBusy(false);
    if (!response.ok) return;
    const payload = await response.json();
    setLiked(Boolean(payload.liked));
    setLikes((current) => Math.max(0, current + (payload.liked ? 1 : -1)));
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? "Retirer mon cœur" : "Aimer cette citation"}
      className={`inline-flex items-center gap-1 font-bold transition hover:text-mint ${liked ? "text-mint" : "text-muted"}`}
    >
      <Heart size={size} aria-hidden fill={liked ? "currentColor" : "none"} />
      {likes}
    </button>
  );
}

// Carte « citation » : le passage, la page, qui l'a relevé et le cœur pour l'aimer.
export function QuoteCard({ quote, isSignedIn }: { quote: QuoteView; isSignedIn: boolean }) {

  return (
    <figure className="bb-card flex flex-col gap-3 p-4 sm:p-5">
      <Quote size={20} aria-hidden className="text-coral" />
      <blockquote className="font-display text-base italic leading-snug text-paper sm:text-lg">{quote.text}</blockquote>
      {quote.book ? <Link href={`/books/${quote.book.id}`} className="text-xs font-extrabold text-mint hover:underline">{quote.book.title}</Link> : null}
      <figcaption className="mt-auto flex items-center gap-2 text-[11px] text-muted">
        {quote.page ? <span className="font-extrabold text-coral">p. {quote.page}</span> : null}
        <span>
          · relevée par{" "}
          <Link href={`/profile/${quote.author.id}`} className="hover:text-mint">{quote.isMine ? "toi" : quote.author.name}</Link>
        </span>
        {!quote.isPublic ? <span className="inline-flex items-center gap-1"><Lock size={11} aria-hidden />privée</span> : null}
        <span className="ml-auto">
          <QuoteLikeButton entryId={quote.id} count={quote.likes} initiallyLiked={quote.likedByMe} isSignedIn={isSignedIn} />
        </span>
      </figcaption>
    </figure>
  );
}

// Bouton qui ouvre le panneau de la fiche livre directement sur « Relever une citation ».
export function AddQuoteButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("booksbox:open-quote"))} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-mint hover:underline">
      + Ajouter une citation
    </button>
  );
}
