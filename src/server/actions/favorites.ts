"use server";

import { requireActionUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(bookId: string) {
  const userId = await requireActionUserId();

  const entry = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: userId, bookId } },
  });

  if (!entry) throw new Error("Livre non présent dans ta bibliothèque");

  await prisma.userBook.update({
    where: { userId_bookId: { userId: userId, bookId } },
    data: { isFavorite: !entry.isFavorite },
  });

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/profile");
}