"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non connecté");
  return session.user.id;
}

// ── Créer une liste ────────────────────────────────────────────────
export async function createList(data: {
  title: string;
  description?: string;
  rating?: number;
  isPublic?: boolean;
}) {
  const userId = await requireSession();

  const list = await prisma.bookList.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      rating: data.rating,
      isPublic: data.isPublic ?? true,
    },
  });

  revalidatePath("/profile");
  return list;
}

// ── Modifier une liste ─────────────────────────────────────────────
export async function updateList(
  listId: string,
  data: {
    title?: string;
    description?: string;
    rating?: number;
    isPublic?: boolean;
  }
) {
  const userId = await requireSession();

  const list = await prisma.bookList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) throw new Error("Non autorisé");

  await prisma.bookList.update({
    where: { id: listId },
    data,
  });

  revalidatePath("/profile");
  revalidatePath(`/lists/${listId}`);
}

// ── Supprimer une liste ────────────────────────────────────────────
export async function deleteList(listId: string) {
  const userId = await requireSession();

  const list = await prisma.bookList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) throw new Error("Non autorisé");

  await prisma.bookList.delete({ where: { id: listId } });

  revalidatePath("/profile");
}

// ── Ajouter un livre à une liste ───────────────────────────────────
export async function addBookToList(data: {
  listId: string;
  bookId: string;
  note?: string;
}) {
  const userId = await requireSession();

  const list = await prisma.bookList.findUnique({ where: { id: data.listId } });
  if (!list || list.userId !== userId) throw new Error("Non autorisé");

  // Ordre = dernier + 1
  const lastEntry = await prisma.bookListEntry.findFirst({
    where: { listId: data.listId },
    orderBy: { order: "desc" },
  });

  await prisma.bookListEntry.create({
    data: {
      listId: data.listId,
      bookId: data.bookId,
      note: data.note,
      order: (lastEntry?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/lists/${data.listId}`);
  revalidatePath("/profile");
}

// ── Retirer un livre d'une liste ───────────────────────────────────
export async function removeBookFromList(listId: string, bookId: string) {
  const userId = await requireSession();

  const list = await prisma.bookList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) throw new Error("Non autorisé");

  await prisma.bookListEntry.delete({
    where: { listId_bookId: { listId, bookId } },
  });

  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
}

// ── Récupérer les listes de l'utilisateur (pour la modal) ─────────
export async function getUserLists() {
  const userId = await requireSession();

  return prisma.bookList.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { entries: true } },
    },
  });
}

export async function reorderList(listId: string, orderedBookIds: string[]) {
  const userId = await requireSession();

  const list = await prisma.bookList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) throw new Error("Non autorisé");

  await prisma.$transaction(
    orderedBookIds.map((bookId, index) =>
      prisma.bookListEntry.update({
        where: { listId_bookId: { listId, bookId } },
        data: { order: index + 1 },
      })
    )
  );

  revalidatePath(`/lists/${listId}`);
}