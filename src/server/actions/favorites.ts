"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(bookId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non connecté");

  const entry = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  });

  if (!entry) throw new Error("Livre non présent dans ta bibliothèque");

  await prisma.userBook.update({
    where: { userId_bookId: { userId: session.user.id, bookId } },
    data: { isFavorite: !entry.isFavorite },
  });

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/profile");
}