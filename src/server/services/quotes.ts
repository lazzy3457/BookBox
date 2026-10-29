import { prisma } from "@/server/db/prisma";
import type { QuoteView } from "@/components/books/QuoteCard";

type QuoteScope = { bookId: string } | { userId: string };

// Citations relevées dans les journaux : publiques pour tous, privées seulement pour leur auteur.
export async function getQuotes(scope: QuoteScope, viewerId: string | null, blockedIds: string[] = [], take = 12): Promise<QuoteView[]> {
  const ownerId = "userId" in scope ? scope.userId : null;
  const showPrivate = Boolean(viewerId && ownerId === viewerId);
  const entries = await prisma.readingEntry.findMany({
    where: {
      kind: "QUOTE",
      note: { not: null },
      period: {
        userBook: {
          ...("bookId" in scope ? { bookId: scope.bookId } : { userId: scope.userId }),
          user: { suspendedAt: null },
          ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {})
        }
      },
      ...(showPrivate
        ? {}
        : viewerId
          ? { OR: [{ isPublic: true }, { period: { userBook: { userId: viewerId } } }] }
          : { isPublic: true })
    },
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      note: true,
      page: true,
      isPublic: true,
      likes: { select: { userId: true } },
      period: { select: { userBook: { select: { user: { select: { id: true, name: true, username: true } }, book: { select: { id: true, title: true } } } } } }
    }
  });

  return entries.map((entry) => {
    const user = entry.period.userBook.user;
    return {
      id: entry.id,
      text: entry.note ?? "",
      page: entry.page,
      author: { id: user.id, name: user.name ?? user.username ?? "Un lecteur" },
      isPublic: entry.isPublic,
      isMine: user.id === viewerId,
      likes: entry.likes.length,
      likedByMe: Boolean(viewerId && entry.likes.some((like) => like.userId === viewerId)),
      book: "userId" in scope ? entry.period.userBook.book : undefined
    };
  });
}
