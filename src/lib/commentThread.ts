export type CommentView = {
  id: string;
  parentId: string | null;
  body: string;
  userId?: string;
  userName: string;
  userImage?: string | null;
  canManage: boolean;
  createdAt: string;
  likesCount: number;
  likedByMe?: boolean;
  deleted?: boolean;
};

export type CommentNode = CommentView & {
  replies: CommentNode[];
  // Nom de l'auteur du commentaire parent, comme le "En réponse à @..." de X.
  replyingTo: string | null;
  // Le parent existe mais n'est pas visible (masqué par la modération ou auteur bloqué).
  parentUnavailable: boolean;
  // Nombre total de réponses dans le sous-fil, tous niveaux confondus.
  descendantsCount: number;
};

function byDate(a: CommentView, b: CommentView) {
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Transforme la liste plate des commentaires d'une review en fils de discussion.
 * Les commentaires dont le parent n'est pas visible remontent à la racine pour ne pas disparaître,
 * et un commentaire supprimé n'est conservé que s'il lui reste des réponses.
 */
export function buildCommentTree(comments: CommentView[]): CommentNode[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const childrenOf = new Map<string, CommentView[]>();
  const roots: CommentView[] = [];

  for (const comment of [...comments].sort(byDate)) {
    if (comment.parentId && byId.has(comment.parentId)) {
      const siblings = childrenOf.get(comment.parentId) ?? [];
      siblings.push(comment);
      childrenOf.set(comment.parentId, siblings);
    } else {
      roots.push(comment);
    }
  }

  function toNode(comment: CommentView): CommentNode | null {
    const replies = (childrenOf.get(comment.id) ?? []).map(toNode).filter((node): node is CommentNode => node !== null);

    if (comment.deleted && !replies.length) {
      return null;
    }

    const parent = comment.parentId ? byId.get(comment.parentId) : undefined;

    return {
      ...comment,
      replies,
      replyingTo: parent && !parent.deleted ? parent.userName : null,
      parentUnavailable: Boolean(comment.parentId && !parent),
      descendantsCount: replies.reduce((total, reply) => total + 1 + reply.descendantsCount, 0)
    };
  }

  return roots.map(toNode).filter((node): node is CommentNode => node !== null);
}

/** Date courte façon X : "à l'instant", "5 min", "3 h", "2 j", puis "12 oct.". */
export function formatCommentDate(createdAt: string, now: Date = new Date()) {
  const date = new Date(createdAt);
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)} j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
  });
}

/** Nombre de commentaires réellement visibles (hors commentaires supprimés conservés pour le fil). */
export function countVisibleComments(comments: CommentView[]) {
  return comments.filter((comment) => !comment.deleted).length;
}
