"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ReportButton } from "@/components/moderation/ReportButton";
import { GroupLikeButton } from "@/components/groups/GroupLikeButton";
import { timeAgo } from "@/lib/format";
import { useConfirm } from "@/components/ui/useConfirm";

export type GroupPostView = {
  id: string;
  parentId: string | null;
  body: string;
  deleted: boolean;
  createdAt: string;
  author: { id: string; name: string; image: string | null; isModerator: boolean };
  likes: number;
  likedByMe: boolean;
  canDelete: boolean;
};

type GroupPostsProps = {
  threadId: string;
  posts: GroupPostView[];
  viewerId: string | null;
  viewerName: string | null;
  viewerImage: string | null;
  canPost: boolean;
};

type Sort = "liked" | "recent";

// Réponses d'une discussion de groupe : un niveau de réponse, likes, suppression et signalement.
export function GroupPosts({ threadId, posts, viewerId, viewerName, viewerImage, canPost }: GroupPostsProps) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("liked");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const roots = posts
    .filter((post) => !post.parentId)
    .sort((a, b) => (sort === "liked" ? b.likes - a.likes || a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const repliesOf = (id: string) => posts.filter((post) => post.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const visibleCount = posts.filter((post) => !post.deleted).length;

  async function send(text: string, parentId: string | null) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/group-threads/${threadId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message ?? "Ton message n'a pas pu être envoyé.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function remove(postId: string) {
    if (!(await confirm({ title: "Supprimer ce message ?", message: "Ses réponses resteront visibles dans le fil." }))) return;
    const response = await fetch(`/api/group-posts/${postId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  const item = (post: GroupPostView, nested = false) => (
    <article key={post.id} className={`bb-card-flat flex flex-col gap-2 px-4 py-3.5 ${nested ? "ml-6 sm:ml-10" : ""}`}>
      {post.deleted ? (
        <p className="text-xs italic text-muted">Message supprimé.</p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs">
            <Link href={`/profile/${post.author.id}`}><Avatar name={post.author.name} image={post.author.image} size={24} /></Link>
            <Link href={`/profile/${post.author.id}`} className="font-extrabold text-paper hover:text-mint">{post.author.name}</Link>
            {post.author.isModerator ? <span className="text-muted">· modérateur</span> : null}
            <span className="text-muted">· {timeAgo(post.createdAt)}</span>
          </p>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-paper">{post.body}</p>
          <div className="flex items-center gap-4 text-xs">
            <GroupLikeButton endpoint={`/api/group-posts/${post.id}/reactions`} count={post.likes} initiallyLiked={post.likedByMe} canLike={canPost} size={13} />
            {canPost ? (
              <button type="button" onClick={() => { setReplyTo(post.parentId ?? post.id); setReplyBody(""); }} className="inline-flex items-center gap-1 font-bold text-muted hover:text-mint">
                <MessageCircle size={13} aria-hidden />
                Répondre
              </button>
            ) : null}
            {post.canDelete ? (
              <button type="button" onClick={() => void remove(post.id)} className="inline-flex items-center gap-1 font-bold text-muted hover:text-coral">
                <Trash2 size={13} aria-hidden />
                Supprimer
              </button>
            ) : viewerId && post.author.id !== viewerId ? (
              <ReportButton targetType="GROUP_POST" targetId={post.id} compact />
            ) : null}
          </div>
        </>
      )}
    </article>
  );

  return (
    <section className="flex flex-col gap-3">
      {confirmDialog}
      <div className="flex items-center justify-between gap-3">
        <h2 className="bb-h2">{visibleCount} réponse{visibleCount > 1 ? "s" : ""}</h2>
        <label className="text-xs font-bold text-muted">
          Trier :{" "}
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="bg-transparent font-bold text-paper outline-none">
            <option value="liked">les plus aimées</option>
            <option value="recent">les plus récentes</option>
          </select>
        </label>
      </div>

      {roots.map((root) => (
        <div key={root.id} className="flex flex-col gap-2">
          {item(root)}
          {repliesOf(root.id).map((reply) => item(reply, true))}
          {replyTo === root.id ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (await send(replyBody, root.id)) setReplyTo(null);
              }}
              className="ml-6 flex gap-2 sm:ml-10"
            >
              <label className="sr-only" htmlFor={`reply-${root.id}`}>Ta réponse</label>
              <input id={`reply-${root.id}`} required value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength={3000} placeholder={`Répondre à ${root.author.name}…`} className="bb-input flex-1 rounded-full" autoFocus />
              <button type="submit" disabled={busy} className="bb-btn-primary">Envoyer</button>
            </form>
          ) : null}
        </div>
      ))}

      {!roots.length ? <p className="bb-card-flat p-5 text-sm text-muted">Pas encore de réponse. Lance la conversation !</p> : null}

      {canPost ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send(body, null)) setBody("");
          }}
          className="flex items-center gap-3 pt-2"
        >
          <Avatar name={viewerName} image={viewerImage} size={34} />
          <label className="sr-only" htmlFor={`post-${threadId}`}>Ton avis</label>
          <input id={`post-${threadId}`} required value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} placeholder="Ton avis sur la question… (@pseudo pour mentionner)" className="bb-input flex-1 rounded-full py-3" />
          <button type="submit" disabled={busy} className="bb-btn-primary px-5 py-3 text-sm">
            <Send size={15} aria-hidden />
            Répondre
          </button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-xs font-bold text-coral">{error}</p> : null}
    </section>
  );
}
