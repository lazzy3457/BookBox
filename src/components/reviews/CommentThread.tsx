"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Edit3, MessageCircle, Send, ThumbsUp, Trash2 } from "lucide-react";
import { ReportButton } from "@/components/moderation/ReportButton";
import { formatCommentDate, type CommentNode } from "@/lib/commentThread";

// Au-delà de cette profondeur, les réponses ne sont plus décalées : le "En réponse à @..." suffit à suivre l'échange.
const MAX_INDENT_DEPTH = 3;
// Un sous-fil plus long que ça est replié par défaut, comme le "Afficher les réponses" de X.
const AUTO_EXPAND_LIMIT = 3;

export type CommentActions = {
  canReport: boolean;
  onLike: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentId: string, body: string) => Promise<boolean>;
};

export function CommentThread({ nodes, actions }: { nodes: CommentNode[]; actions: CommentActions }) {
  if (!nodes.length) {
    return null;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <CommentItem key={node.id} node={node} depth={0} actions={actions} />
      ))}
    </div>
  );
}

function CommentAvatar({ node }: { node: CommentNode }) {
  const avatar = (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-mint text-xs font-extrabold text-ink">
      {node.userImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.userImage} alt="" className="h-full w-full object-cover" />
      ) : (
        node.userName.slice(0, 1).toUpperCase()
      )}
    </span>
  );

  return node.userId ? (
    <Link href={`/profile/${node.userId}`} className="transition hover:opacity-85">
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

function CommentItem({ node, depth, actions }: { node: CommentNode; depth: number; actions: CommentActions }) {
  const [showReplies, setShowReplies] = useState(node.descendantsCount <= AUTO_EXPAND_LIMIT);
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [isSending, setIsSending] = useState(false);

  const hasReplies = node.replies.length > 0;
  const indentReplies = depth + 1 < MAX_INDENT_DEPTH;

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!replyBody.trim()) {
      return;
    }

    setIsSending(true);
    const ok = await actions.onReply(node.id, replyBody);
    setIsSending(false);

    if (ok) {
      setReplyBody("");
      setIsReplying(false);
      setShowReplies(true);
    }
  }

  async function submitEdit() {
    setIsSending(true);
    const ok = await actions.onEdit(node.id, editBody);
    setIsSending(false);

    if (ok) {
      setIsEditing(false);
    }
  }

  const replies = hasReplies ? (
    showReplies ? (
      <div className={indentReplies ? "ml-[18px] border-l border-line pl-3" : ""}>
        {node.replies.map((reply) => (
          <CommentItem key={reply.id} node={reply} depth={depth + 1} actions={actions} />
        ))}
      </div>
    ) : null
  ) : null;

  const repliesToggle = hasReplies ? (
    <button
      type="button"
      onClick={() => setShowReplies((current) => !current)}
      className="ml-12 mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky transition hover:text-mint"
    >
      {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      {showReplies
        ? "Masquer les réponses"
        : `Afficher ${node.descendantsCount} réponse${node.descendantsCount > 1 ? "s" : ""}`}
    </button>
  ) : null;

  if (node.deleted) {
    return (
      <div className="min-w-0 pt-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-9 w-9 shrink-0 rounded-full border border-dashed border-line" />
          <p className="text-sm italic text-muted/70">Ce commentaire a été supprimé.</p>
        </div>
        {repliesToggle}
        {replies}
      </div>
    );
  }

  return (
    <div className="min-w-0 pt-2">
      <div className="flex min-w-0 gap-3">
        <CommentAvatar node={node} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
              {node.userId ? (
                <Link href={`/profile/${node.userId}`} className="truncate font-extrabold text-paper transition hover:text-mint">
                  {node.userName}
                </Link>
              ) : (
                <span className="truncate font-extrabold text-paper">{node.userName}</span>
              )}
              <span className="text-muted/60">·</span>
              <time dateTime={node.createdAt} className="text-muted/70" suppressHydrationWarning>
                {formatCommentDate(node.createdAt)}
              </time>
            </div>

            {node.canManage ? (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditBody(node.body);
                    setIsEditing((current) => !current);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted transition hover:border-mint hover:text-mint"
                  title="Editer le commentaire"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => actions.onDelete(node.id)}
                  className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted transition hover:border-coral hover:text-coral"
                  title="Supprimer le commentaire"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : actions.canReport ? (
              <ReportButton targetType="COMMENT" targetId={node.id} compact />
            ) : null}
          </div>

          {node.replyingTo ? (
            <p className="text-xs text-muted/70">
              En réponse à <span className="font-bold text-sky">@{node.replyingTo}</span>
            </p>
          ) : node.parentUnavailable ? (
            <p className="text-xs italic text-muted/60">En réponse à un commentaire indisponible</p>
          ) : null}

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                className="min-h-20 w-full resize-y rounded-xl border border-line bg-panel px-3 py-2 text-sm text-paper outline-none focus:border-mint"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={submitEdit}
                  className="bb-btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bb-btn-ghost px-3 py-1.5 text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-6 text-paper/80">{node.body}</p>
          )}

          <div className="mt-1 flex items-center gap-5 text-xs font-bold text-muted">
            <button
              type="button"
              onClick={() => setIsReplying((current) => !current)}
              className={`inline-flex items-center gap-1 transition hover:text-sky ${isReplying ? "text-sky" : ""}`}
              title="Repondre"
            >
              <MessageCircle size={13} />
              {node.descendantsCount || null}
            </button>
            <button
              type="button"
              onClick={() => actions.onLike(node.id)}
              className={`inline-flex items-center gap-1 transition hover:text-mint ${node.likedByMe ? "text-mint" : ""}`}
              title={node.likedByMe ? "Retirer le like" : "Aimer"}
            >
              <ThumbsUp size={13} />
              {node.likesCount || null}
            </button>
          </div>

          {isReplying ? (
            <form onSubmit={submitReply} className="mt-2">
              <p className="mb-1 text-xs text-muted/70">
                En réponse à <span className="font-bold text-sky">@{node.userName}</span>
              </p>
              <div className="grid gap-2 sm:flex">
                <input
                  autoFocus
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  maxLength={1200}
                  className="h-9 min-w-0 flex-1 rounded-full border border-line bg-ink px-4 text-sm text-paper outline-none placeholder:text-muted/45 focus:border-mint"
                  placeholder="Poste ta reponse..."
                />
                <button
                  disabled={isSending || !replyBody.trim()}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-mint px-4 text-xs font-extrabold text-ink disabled:opacity-60"
                >
                  <Send size={13} />
                  {isSending ? "Envoi..." : "Repondre"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {repliesToggle}
      {replies}
    </div>
  );
}
