"use client";

import { useState } from "react";
import { Eye, MessageCircle, Send, ThumbsUp, TriangleAlert } from "lucide-react";

type ReviewCardProps = {
  review: {
    id: string;
    rating: number;
    body: string | null;
    spoiler: boolean;
    userName: string;
    reactionsCount: number;
    comments: Array<{
      id: string;
      body: string;
      userName: string;
      createdAt: string;
    }>;
  };
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [isRevealed, setIsRevealed] = useState(!review.spoiler);
  const [comments, setComments] = useState(review.comments);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/reviews/${review.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible d'ajouter le commentaire.");
      return;
    }

    setComments((current) => [
      ...current,
      {
        id: payload.id,
        body: payload.body,
        userName: payload.user?.name ?? "Lecteur BooksBox",
        createdAt: payload.createdAt
      }
    ]);
    setBody("");
  }

  return (
    <article className="rounded border border-line bg-panel/82 p-5 shadow-poster">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-black text-paper">{review.userName}</div>
          <div className="mt-1 text-sm text-amber">{review.rating}/5</div>
        </div>
        {review.spoiler ? (
          <div className="inline-flex items-center gap-1 rounded bg-coral/15 px-2 py-1 text-xs font-bold text-coral">
            <TriangleAlert size={13} />
            Spoiler
          </div>
        ) : null}
      </div>

      {review.body ? (
        <div className="mt-4">
          {isRevealed ? (
            <p className="leading-7 text-white/65">{review.body}</p>
          ) : (
            <div className="rounded border border-coral/30 bg-coral/8 p-4">
              <p className="text-sm text-muted">Cette review contient des spoilers.</p>
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="mt-3 inline-flex items-center gap-2 rounded bg-coral px-3 py-2 text-xs font-black text-white"
              >
                <Eye size={14} />
                Reveler la review
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5 flex gap-4 border-b border-line pb-4 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp size={14} /> {review.reactionsCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} /> {comments.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded border border-line bg-ink/55 px-3 py-2">
            <div className="text-xs font-black text-paper">{comment.userName}</div>
            <p className="mt-1 text-sm leading-6 text-muted">{comment.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submitComment} className="mt-4 flex gap-2">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="h-10 flex-1 rounded border border-line bg-ink px-3 text-sm text-white outline-none placeholder:text-muted/45 focus:border-mint"
          placeholder="Ajouter un commentaire..."
        />
        <button
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-2 rounded bg-mint px-3 text-xs font-black text-ink disabled:opacity-60"
        >
          <Send size={14} />
          {isSaving ? "Envoi..." : "Commenter"}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-coral">{message}</p> : null}
    </article>
  );
}
