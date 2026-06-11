"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Eye, MessageCircle, Send, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { RatingControl } from "@/components/reviews/RatingControl";
import { StarRating } from "@/components/reviews/StarRating";
import { Toast } from "@/components/ui/Toast";

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
    userId?: string;
    userName: string;
    userImage?: string | null;
    canManage: boolean;
    reactionsCount: number;
    comments: CommentView[];
  };
};

export function ReviewCard({ review }: ReviewCardProps) {
  const router = useRouter();
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
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isDeleted) {
    return toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null;
  }

  const userAvatar = (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded bg-mint text-sm font-black text-ink">
      {review.userImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={review.userImage} alt="" className="h-full w-full object-cover" />
      ) : (
        review.userName.slice(0, 1).toUpperCase()
      )}
    </span>
  );

  const userName = <span className="font-black text-paper">{review.userName}</span>;

  async function toggleReviewLike() {
    const response = await fetch(`/api/reviews/${review.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "LIKE" })
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({ tone: "error", message: "Ton like n'a pas ete pris en compte. Reessaie." });
      return;
    }

    setLikesCount((current) => Math.max(0, current + (payload.liked ? 1 : -1)));
    setToast({ tone: "success", message: payload.liked ? "Review ajoutee a tes likes." : "Like retire." });
    router.refresh();
  }

  async function toggleCommentLike(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}/reactions`, {
      method: "POST"
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({ tone: "error", message: "Ton like n'a pas ete pris en compte. Reessaie." });
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, likesCount: Math.max(0, comment.likesCount + (payload.liked ? 1 : -1)) }
          : comment
      )
    );
    setToast({ tone: "success", message: payload.liked ? "Commentaire aime." : "Like retire." });
    router.refresh();
  }

  function startEditComment(comment: CommentView) {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  }

  async function saveComment(commentId: string) {
    setToast(null);
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editingCommentBody })
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({ tone: "error", message: "Le commentaire n'a pas pu etre modifie." });
      return;
    }

    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? { ...comment, body: payload.body } : comment))
    );
    setEditingCommentId(null);
    setEditingCommentBody("");
    setToast({ tone: "success", message: "Commentaire modifie." });
    router.refresh();
  }

  async function deleteComment(commentId: string) {
    setToast(null);
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setToast({ tone: "error", message: "Le commentaire n'a pas pu etre supprime." });
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setToast({ tone: "success", message: "Commentaire supprime." });
    router.refresh();
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    setIsSaving(true);

    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, body: reviewBody || undefined, spoiler })
    });

    setIsSaving(false);

    if (!response.ok) {
      setToast({ tone: "error", message: "Ta review n'a pas pu etre modifiee." });
      return;
    }

    setIsEditing(false);
    setIsRevealed(!spoiler);
    setToast({ tone: "success", message: "Ta review a ete mise a jour." });
    router.refresh();
  }

  async function deleteReview() {
    setToast(null);
    const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });

    if (!response.ok) {
      setToast({ tone: "error", message: "Ta review n'a pas pu etre supprimee." });
      return;
    }

    setIsDeleted(true);
    setToast({ tone: "success", message: "Review supprimee." });
    router.refresh();
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    setIsSaving(true);
    setToast(null);

    const response = await fetch(`/api/reviews/${review.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setToast({ tone: "error", message: "Ton commentaire n'a pas pu etre publie." });
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
    setToast({ tone: "success", message: "Commentaire publie." });
    router.refresh();
  }

  return (
    <article className="w-full min-w-0 max-w-full overflow-hidden rounded border border-line bg-panel/82 p-4 shadow-poster sm:p-5">
      <div className="grid min-w-0 gap-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {review.userId ? (
            <Link href={`/profile/${review.userId}`} className="transition hover:opacity-85">
              {userAvatar}
            </Link>
          ) : (
            userAvatar
          )}
          <div className="min-w-0">
            {review.userId ? (
              <Link href={`/profile/${review.userId}`} className="transition hover:text-mint">
                {userName}
              </Link>
            ) : (
              userName
            )}
            <div className="mt-2">
              <StarRating value={rating} />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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

      <div className="mt-5 flex min-w-0 flex-wrap gap-4 border-b border-line pb-4 text-xs font-bold text-muted">
        <button type="button" onClick={toggleReviewLike} className="inline-flex items-center gap-1 transition hover:text-mint">
          <ThumbsUp size={14} /> {likesCount}
        </button>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} /> {comments.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="min-w-0 overflow-hidden rounded border border-line bg-ink/55 px-3 py-2">
            <div className="grid min-w-0 gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
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

      <form onSubmit={submitComment} className="mt-4 grid gap-2 sm:flex">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded border border-line bg-ink px-3 text-sm text-white outline-none placeholder:text-muted/45 focus:border-mint"
          placeholder="Ajouter un commentaire..."
        />
        <button
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-mint px-3 text-xs font-black text-ink disabled:opacity-60"
        >
          <Send size={14} />
          {isSaving ? "Envoi..." : "Commenter"}
        </button>
      </form>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </article>
  );
}
