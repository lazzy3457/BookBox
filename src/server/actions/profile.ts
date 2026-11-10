"use server";

import { requireActionUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  name?: string;
  bio?: string;
  image?: string;
}) {
  const userId = await requireActionUserId();

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name?.trim() || undefined,
      bio: data.bio?.trim() || undefined,
      image: data.image?.trim() || undefined,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/", "layout");
}
