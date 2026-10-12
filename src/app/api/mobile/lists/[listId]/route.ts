import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getCurrentUserId, requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { listMutationSchema } from "@/server/validation/lists";
import { areUsersBlocked, getBlockedUserIds } from "@/server/services/blocks";

async function getList(listId: string) {
  return prisma.bookList.findUnique({
    where: { id: listId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true
          ,
          suspendedAt: true
        }
      },
      entries: {
        orderBy: { order: "asc" },
        include: {
          book: {
            include: {
              reviews: {
                where: { hiddenAt: null, user: { suspendedAt: null } },
                include: {
                  user: true,
                  reactions: true,
                  comments: { where: { hiddenAt: null, user: { suspendedAt: null } }, include: { user: true, likes: true }, orderBy: { createdAt: "asc" } }
                }
              }
            }
          }
        }
      },
      _count: { select: { entries: true } }
    }
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const { listId } = await params;
    const list = await getList(listId);

    if (!list || list.user.suspendedAt || (!list.isPublic && list.userId !== currentUserId)) {
      throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
    }
    if (currentUserId && await areUsersBlocked(currentUserId, list.userId)) {
      throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
    }

    const blockedUserIds = new Set(currentUserId ? await getBlockedUserIds(currentUserId) : []);
    const visibleList = {
      ...list,
      entries: list.entries.map((entry) => ({
        ...entry,
        book: {
          ...entry.book,
          reviews: entry.book.reviews
            .filter((review) => !blockedUserIds.has(review.userId))
            .map((review) => ({
              ...review,
              comments: review.comments.filter((comment) => !blockedUserIds.has(comment.userId))
            }))
        }
      }))
    };

    return NextResponse.json({ list: visibleList, canManage: list.userId === currentUserId });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { listId } = await params;
    const input = listMutationSchema.partial().parse(await request.json());
    const existing = await prisma.bookList.findUnique({ where: { id: listId } });

    if (!existing || existing.userId !== userId) {
      throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
    }

    await prisma.bookList.update({
      where: { id: listId },
      data: input
    });

    const list = await getList(listId);

    return NextResponse.json({ list });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { listId } = await params;
    const existing = await prisma.bookList.findUnique({ where: { id: listId } });

    if (!existing || existing.userId !== userId) {
      throw notFound("Liste introuvable.", "LIST_NOT_FOUND");
    }

    await prisma.bookList.delete({ where: { id: listId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
