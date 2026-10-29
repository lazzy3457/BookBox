import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ProfileView, parseProfileTab } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon profil"
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);

  if (!session?.user?.id) {
    return (
      <div className="bb-card mx-auto mt-6 flex max-w-xl flex-col items-start gap-3 p-6 sm:p-8">
        <h1 className="bb-h1">Profil lecteur</h1>
        <p className="text-sm text-muted">Connecte-toi pour voir ton profil.</p>
        <Link href="/login?callbackUrl=/profile" className="bb-btn-primary px-5 py-2.5 text-sm">Connexion</Link>
      </div>
    );
  }

  return <ProfileView userId={session.user.id} viewerId={session.user.id} tab={parseProfileTab(params.tab)} basePath="/profile" />;
}
