import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { isGoogleAuthEnabled } from "@/server/auth/google";
import { isRecentGoogleSignIn } from "@/server/auth/session";
import { SettingsWorkspace, type SettingsSection } from "@/components/settings/SettingsWorkspace";
import { LibraryImport } from "@/components/settings/LibraryImport";
import { AccountDataControls } from "@/components/settings/AccountDataControls";
import { BlockedUsers } from "@/components/settings/BlockedUsers";
import { prisma } from "@/server/db/prisma";
import { resolveTheme } from "@/lib/themes";
import { getOrCreateNotificationPreferences } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paramètres"
};

const sections: SettingsSection[] = ["profil", "securite", "lecture", "notifications", "confidentialite", "bloques", "importer", "donnees"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ rubrique?: string; suppression?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);

  if (!session?.user?.id) {
    return (
      <div className="bb-card mx-auto mt-6 flex max-w-xl flex-col items-start gap-3 p-6 sm:p-8">
        <h1 className="bb-h1">Paramètres</h1>
        <p className="text-sm text-muted">Connecte-toi pour accéder aux paramètres de ton compte.</p>
        <Link href="/login?callbackUrl=/settings" className="bb-btn-primary px-5 py-2.5 text-sm">Connexion</Link>
      </div>
    );
  }

  const section = sections.includes(params.rubrique as SettingsSection) ? (params.rubrique as SettingsSection) : "profil";
  const [{ passwordHash, ...user }, preference, notifications, blockedCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, username: true, email: true, emailVerified: true, image: true, bio: true, createdAt: true, passwordHash: true }
    }),
    prisma.userPreference.findUnique({ where: { userId: session.user.id } }),
    getOrCreateNotificationPreferences(session.user.id),
    prisma.userBlock.count({ where: { blockerId: session.user.id } })
  ]);
  // Un compte créé via Google n'a pas de mot de passe : ses actions sensibles passent par Google ou par un lien e-mail.
  const hasPassword = Boolean(passwordHash);
  const dataControls = (
    <AccountDataControls
      hasPassword={hasPassword}
      email={user.email}
      googleAvailable={isGoogleAuthEnabled()}
      googleConfirmed={isRecentGoogleSignIn(session.googleSignInAt)}
      reopenDeletion={params.suppression === "google"}
    />
  );

  return (
    <SettingsWorkspace
      section={section}
      profile={user}
      hasPassword={hasPassword}
      hideSpoilers={preference?.hideSpoilers ?? true}
      theme={resolveTheme(preference?.theme)}
      notifications={notifications}
      blockedCount={blockedCount}
      slots={{ blocked: <BlockedUsers />, importer: <LibraryImport />, data: dataControls }}
    />
  );
}
