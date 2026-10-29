"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Eye, MessageCircle, Send, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { CommentThread, type CommentActions } from "@/components/reviews/CommentThread";
import { RatingControl } from "@/components/reviews/RatingControl";
import { StarRating } from "@/components/reviews/StarRating";
import { Toast } from "@/components/ui/Toast";
import { ReportButton } from "@/components/moderation/ReportButton";
import { useUserPreferences } from "@/components/settings/UserPreferencesProvider";
import { useConfirm } from "@/components/ui/useConfirm";
import { buildCommentTree, countVisibleComments, type CommentView } from "@/lib/commentThread";

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
    canReport?: boolean;
    reactionsCount: number;
    comments: CommentView[];
  };
};

export function ReviewCard({ review }: ReviewCardProps) {
  const router = useRouter();
  const { hideSpoilers } = useUserPreferences();
  const [isDeleted, setIsDeleted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!review.spoiler || !hideSpoilers);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(Math.max(1, Math.min(5, review.rating)));
  const [reviewBody, setReviewBody] = useState(review.body ?? "");
  const [spoiler, setSpoiler] = useState(review.spoiler);
  const [likesCount, setLikesCount] = useState(review.reactionsCount);
  const [comments, setComments] = useState(review.comments);
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [isSaving, setIsSaving] = useState(false);

  if (isDeleted) {
    return toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null;
  }

  const userAvatar = (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-mint text-sm font-extrabold text-ink">
      {review.userImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={review.userImage} alt="" className="h-full w-full object-cover" />
      ) : (
        review.userName.slice(0, 1).toUpperCase()
      )}
    </span>
  );

  const userName = <span className="font-display text-base font-semibold text-paper">{review.userName}</span>;

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
          ? { ...comment, likedByMe: payload.liked, likesCount: Math.max(0, comment.likesCount + (payload.liked ? 1 : -1)) }
          : comment
      )
    );
    router.refresh();
  }

  async function saveComment(commentId: string, nextBody: string) {
    setToast(null);
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: nextBody })
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({ tone: "error", message: "Le commentaire n'a pas pu etre modifie." });
      return false;
    }

    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? { ...comment, body: payload.body } : comment))
    );
    setToast({ tone: "success", message: "Commentaire modifie." });
    router.refresh();
    return true;
  }

  async function deleteComment(commentId: string) {
    if (!(await confirm({ title: "Supprimer ce commentaire ?", message: "Cette action est définitive." }))) return;
    setToast(null);
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE"
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setToast({ tone: "error", message: "Le commentaire n'a pas pu etre supprime." });
      return;
    }

    // Un commentaire qui a des réponses reste dans le fil, vidé ; sinon il disparaît.
    setComments((current) =>
      payload.softDeleted
        ? current.map((comment) =>
            comment.id === commentId
              ? { ...comment, body: "", userId: undefined, userName: "", userImage: null, canManage: false, likesCount: 0, likedByMe: false, deleted: true }
              : comment
          )
        : current.filter((comment) => comment.id !== commentId)
    );
    setToast({ tone: "success", message: "Commentaire supprime." });
    router.refresh();
  }

  async function postComment(commentBody: string, parentId?: string) {
    setToast(null);
    const response = await fetch(`/api/reviews/${review.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody, parentId })
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({
        tone: "error",
        message: response.status === 401 ? "Connecte-toi pour participer a la discussion." : "Ton commentaire n'a pas pu etre publie."
      });
      return false;
    }

    setComments((current) => [
      ...current,
      {
        id: payload.id,
        parentId: payload.parentId ?? null,
        body: payload.body,
        userId: payload.userId,
        userName: payload.user?.name ?? "Lecteur BooksBox",
        userImage: payload.user?.image ?? null,
        canManage: true,
        createdAt: payload.createdAt,
        likesCount: 0,
        likedByMe: false
      }
    ]);
    setToast({ tone: "success", message: parentId ? "Reponse publiee." : "Commentaire publie." });
    router.refresh();
    return true;
  }

  const commentActions: CommentActions = {
    canReport: Boolean(review.canReport),
    onLike: toggleCommentLike,
    onEdit: saveComment,
    onDelete: deleteComment,
    onReply: (parentId, replyBody) => postComment(replyBody, parentId)
  };

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
    if (!(await confirm({ title: "Supprimer ton avis ?", message: "Ta note, ton texte et les commentaires reçus seront supprimés." }))) return;
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
    const ok = await postComment(body);
    setIsSaving(false);

    if (ok) {
      setBody("");
    }
  }

  return (
    <article className="bb-card w-full min-w-0 max-w-full overflow-hidden p-4 sm:p-5">
      {confirmDialog}
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
            <div className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2 py-1 text-xs font-bold text-coral">
              <TriangleAlert size={13} />
              Spoiler
            </div>
          ) : null}
          {review.canManage ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:border-mint hover:text-mint"
                title="Editer"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={deleteReview}
                className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:border-coral hover:text-coral"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : review.canReport ? <ReportButton targetType="REVIEW" targetId={review.id} compact /> : null}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={saveReview} className="mt-4 rounded-xl bg-ink p-4">
          <RatingControl value={rating} onChange={setRating} />
          <textarea
            value={reviewBody}
            onChange={(event) => setReviewBody(event.target.value)}
            className="mt-3 min-h-28 w-full resize-y rounded-xl border border-line bg-panel px-3 py-2 text-sm text-paper outline-none focus:border-mint"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
            Contient des spoilers
          </label>
          <div className="mt-3 flex gap-2">
            <button disabled={isSaving} className="bb-btn-primary px-3 py-1.5 text-xs">
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="bb-btn-ghost px-3 py-1.5 text-xs">
              Annuler
            </button>
          </div>
        </form>
      ) : reviewBody ? (
        <div className="mt-4">
          {isRevealed ? (
            <p className="text-sm leading-relaxed text-paper">{reviewBody}</p>
          ) : (
            <div className="rounded-xl border border-coral/30 bg-coral/5 p-4">
              <p className="text-sm text-muted">Cet avis contient des spoilers.</p>
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="mt-3 bb-btn bg-coral px-3 py-1.5 text-xs text-white"
              >
                <Eye size={14} />
                Révéler l'avis
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex min-w-0 flex-wrap gap-4 border-b border-line pb-4 text-xs font-bold text-muted">
        <button type="button" onClick={toggleReviewLike} className="inline-flex items-center gap-1 transition hover:text-mint">
          <ThumbsUp size={14} /> {likesCount}
        </button>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} /> {countVisibleComments(comments)}
        </span>
      </div>

      <form onSubmit={submitComment} className="mt-4 grid gap-2 sm:flex">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1200}
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-ink px-4 text-sm text-paper outline-none placeholder:text-muted/45 focus:border-mint"
          placeholder="Lance la discussion..."
        />
        <button
          disabled={isSaving || !body.trim()}
          className="bb-btn-primary h-10 px-4 text-xs"
        >
          <Send size={14} />
          {isSaving ? "Envoi..." : "Commenter"}
        </button>
      </form>

      <div className="mt-3">
        <CommentThread nodes={commentTree} actions={commentActions} />
      </div>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </article>
  );
}
