import type { CommentView } from "@/lib/commentThread";
import { prisma } from "@/server/db/prisma";

type CommentRow = {
  id: string;
  parentId: string | null;
  body: string;
  userId: string;
  createdAt: Date;
  deletedAt: Date | null;
  user: { name: string | null; image: string | null };
  likes: Array<{ userId: string }>;
};

/** Prépare un commentaire pour l'affichage en fil, sans rien exposer d'un commentaire supprimé. */
export function toCommentView(comment: CommentRow, viewerId: string | null | undefined): CommentView {
  if (comment.deletedAt) {
    return {
      id: comment.id,
      parentId: comment.parentId,
      body: "",
      userName: "",
      canManage: false,
      createdAt: comment.createdAt.toISOString(),
      likesCount: 0,
      deleted: true
    };
  }

  return {
    id: comment.id,
    parentId: comment.parentId,
    body: comment.body,
    userId: comment.userId,
    userName: comment.user.name ?? "Lecteur BooksBox",
    userImage: comment.user.image,
    canManage: Boolean(viewerId && comment.userId === viewerId),
    createdAt: comment.createdAt.toISOString(),
    likesCount: comment.likes.length,
    likedByMe: Boolean(viewerId && comment.likes.some((like) => like.userId === viewerId))
  };
}

/**
 * Supprime un commentaire sans casser le fil : s'il a des réponses, il est vidé et marqué supprimé ;
 * sinon il est effacé, ainsi que les parents déjà supprimés qui n'ont plus aucune réponse.
 */
export async function deleteCommentKeepingThread(commentId: string) {
  return prisma.$transaction(async (transaction) => {
    const repliesCount = await transaction.reviewComment.count({ where: { parentId: commentId } });

    if (repliesCount > 0) {
      await transaction.reviewCommentReaction.deleteMany({ where: { commentId } });
      await transaction.reviewComment.update({ where: { id: commentId }, data: { body: "", deletedAt: new Date() } });
      return { softDeleted: true };
    }

    const removed = await transaction.reviewComment.delete({ where: { id: commentId }, select: { parentId: true } });
    let parentId = removed.parentId;

    while (parentId) {
      const parent = await transaction.reviewComment.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true, deletedAt: true, _count: { select: { replies: true } } }
      });

      if (!parent?.deletedAt || parent._count.replies > 0) {
        break;
      }

      await transaction.reviewComment.delete({ where: { id: parent.id } });
      parentId = parent.parentId;
    }

    return { softDeleted: false };
  });
}
