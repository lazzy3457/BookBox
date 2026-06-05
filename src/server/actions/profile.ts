"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  name?: string;
  bio?: string;
  image?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non connecté");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name?.trim() || undefined,
      bio: data.bio?.trim() || undefined,
      image: data.image?.trim() || undefined,
    },
  });

  revalidatePath("/profile");
}