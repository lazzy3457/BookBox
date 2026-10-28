import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { areUsersBlocked } from "@/server/services/blocks";
import { ProfileView, parseProfileTab } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId, suspendedAt: null }, select: { name: true, username: true } });
  return { title: user ? user.name ?? user.username ?? "Lecteur" : "Lecteur introuvable" };
}

export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [session, { userId }, query] = await Promise.all([getServerSession(authOptions), params, searchParams]);
  const viewerId = session?.user?.id ?? null;
  if (viewerId && viewerId !== userId && (await areUsersBlocked(viewerId, userId))) notFound();

  const [user, follow] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId, suspendedAt: null }, select: { id: true } }),
    viewerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } }) : null
  ]);
  if (!user) notFound();

  // « Voir comme les autres » : son propre profil public s'affiche sans les commandes du propriétaire.
  return (
    <ProfileView
      userId={userId}
      viewerId={viewerId === userId ? null : viewerId}
      tab={parseProfileTab(query.tab)}
      basePath={`/profile/${userId}`}
      isFollowing={Boolean(follow)}
      preview={viewerId === userId}
    />
  );
}
