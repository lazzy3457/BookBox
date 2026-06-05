"use client";

import { useState } from "react";
import { Edit3, Eye, MessageCircle, Send, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { RatingControl } from "@/components/reviews/RatingControl";
import { StarRating } from "@/components/reviews/StarRating";

type CommentView = {
  id: string;
  body: string;
  userName: string;
  canManage: boolean;
  createdAt: string;
  likesCount: number;
};

type ReviewCardProps = {
  review: {
    id: string;
    rating: number;
    body: string | null;
    spoiler: boolean;
    userName: string;
    canManage: boolean;
    reactionsCount: number;
    comments: CommentView[];
  };
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [isDeleted, setIsDeleted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!review.spoiler);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(Math.max(1, Math.min(5, review.rating)));
  const [reviewBody, setReviewBody] = useState(review.body ?? "");
  const [spoiler, setSpoiler] = useState(review.spoiler);
  const [likesCount, setLikesCount] = useState(review.reactionsCount);
  const [comments, setComments] = useState(review.comments);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (isDeleted) {
    return null;
  }

  async function toggleReviewLike() {
    const response = await fetch(`/api/reviews/${review.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "LIKE" })
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de liker cette review.");
      return;
    }

    setLikesCount((current) => Math.max(0, current + (payload.liked ? 1 : -1)));
  }

  async function toggleCommentLike(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}/reactions`, {
      method: "POST"
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de liker ce commentaire.");
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, likesCount: Math.max(0, comment.likesCount + (payload.liked ? 1 : -1)) }
          : comment
      )
    );
  }

  function startEditComment(comment: CommentView) {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  }

  async function saveComment(commentId: string) {
    setMessage("");
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editingCommentBody })
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de modifier ce commentaire.");
      return;
    }

    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? { ...comment, body: payload.body } : comment))
    );
    setEditingCommentId(null);
    setEditingCommentBody("");
  }

  async function deleteComment(commentId: string) {
    setMessage("");
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE"
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de supprimer ce commentaire.");
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, body: reviewBody || undefined, spoiler })
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de modifier cette review.");
      return;
    }

    setIsEditing(false);
    setIsRevealed(!spoiler);
  }

  async function deleteReview() {
    setMessage("");
    const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de supprimer cette review.");
      return;
    }

    setIsDeleted(true);
  }

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
        canManage: true,
        createdAt: payload.createdAt,
        likesCount: 0
      }
    ]);
    setBody("");
  }

  return (
    <article className="rounded border border-line bg-panel/82 p-5 shadow-poster">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-black text-paper">{review.userName}</div>
          <div className="mt-2">
            <StarRating value={rating} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {spoiler ? (
            <div className="inline-flex items-center gap-1 rounded bg-coral/15 px-2 py-1 text-xs font-bold text-coral">
              <TriangleAlert size={13} />
              Spoiler
            </div>
          ) : null}
          {review.canManage ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className="grid h-8 w-8 place-items-center rounded border border-line text-muted transition hover:border-mint hover:text-mint"
                title="Editer"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={deleteReview}
                className="grid h-8 w-8 place-items-center rounded border border-line text-muted transition hover:border-coral hover:text-coral"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={saveReview} className="mt-4 rounded border border-line bg-ink/55 p-4">
          <RatingControl value={rating} onChange={setRating} />
          <textarea
            value={reviewBody}
            onChange={(event) => setReviewBody(event.target.value)}
            className="mt-3 min-h-28 w-full resize-y rounded border border-line bg-ink px-3 py-2 text-sm text-white outline-none focus:border-mint"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
            Contient des spoilers
          </label>
          <div className="mt-3 flex gap-2">
            <button disabled={isSaving} className="rounded bg-mint px-3 py-2 text-xs font-black text-ink">
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded border border-line px-3 py-2 text-xs font-bold text-muted">
              Annuler
            </button>
          </div>
        </form>
      ) : reviewBody ? (
        <div className="mt-4">
          {isRevealed ? (
            <p className="leading-7 text-white/65">{reviewBody}</p>
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
        <button type="button" onClick={toggleReviewLike} className="inline-flex items-center gap-1 transition hover:text-mint">
          <ThumbsUp size={14} /> {likesCount}
        </button>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} /> {comments.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded border border-line bg-ink/55 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-black text-paper">{comment.userName}</div>
              {comment.canManage ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => startEditComment(comment)}
                    className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition hover:border-mint hover:text-mint"
                    title="Editer le commentaire"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id)}
                    className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition hover:border-coral hover:text-coral"
                    title="Supprimer le commentaire"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : null}
            </div>
            {editingCommentId === comment.id ? (
              <div className="mt-2">
                <textarea
                  value={editingCommentBody}
                  onChange={(event) => setEditingCommentBody(event.target.value)}
                  className="min-h-20 w-full resize-y rounded border border-line bg-ink px-3 py-2 text-sm text-white outline-none focus:border-mint"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveComment(comment.id)}
                    className="rounded bg-mint px-3 py-1.5 text-xs font-black text-ink"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCommentId(null)}
                    className="rounded border border-line px-3 py-1.5 text-xs font-bold text-muted"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm leading-6 text-muted">{comment.body}</p>
            )}
            <button
              type="button"
              onClick={() => toggleCommentLike(comment.id)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted transition hover:text-mint"
            >
              <ThumbsUp size={12} />
              {comment.likesCount}
            </button>
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
