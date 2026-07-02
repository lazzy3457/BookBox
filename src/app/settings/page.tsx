import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { LibraryImport } from "@/components/settings/LibraryImport";
import { AccountDataControls } from "@/components/settings/AccountDataControls";
import { BlockedUsers } from "@/components/settings/BlockedUsers";
import { prisma } from "@/server/db/prisma";
import { getOrCreateNotificationPreferences } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="rounded border border-line bg-panel/75 p-8 shadow-poster">
        <h1 className="text-2xl font-black text-paper">Parametres</h1>
        <p className="mt-3 text-muted">Connecte-toi pour acceder aux parametres de ton compte.</p>
        <Link href="/login" className="mt-5 inline-block rounded bg-mint px-5 py-3 font-black text-ink">
          Connexion
        </Link>
      </div>
    );
  }

  const [user, preference, notifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, username: true, email: true, emailVerified: true, image: true, bio: true, createdAt: true }
    }),
    prisma.userPreference.findUnique({ where: { userId: session.user.id } }),
    getOrCreateNotificationPreferences(session.user.id)
  ]);

  return (
    <div>
      <SectionHeader
        eyebrow="Compte"
        title="Parametres"
        description="Gère ton profil, ton expérience de lecture, tes notifications et les données de ton compte."
      />

      <section className="mb-7 rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded border border-line bg-ink text-3xl font-black text-mint">
            {(user.name ?? "B").slice(0, 1)}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Session active</div>
            <h2 className="mt-2 text-2xl font-black text-paper">{user.name ?? "Lecteur BooksBox"}</h2>
            <p className="mt-1 text-sm text-muted">@{user.username ?? "pseudo-à-compléter"} · Membre depuis {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(user.createdAt)}</p>
            <p className="mt-1 text-sm text-muted">{user.email} · {user.emailVerified ? "E-mail vérifié" : "E-mail à vérifier"}</p>
          </div>
        </div>
      </section>

      <SettingsWorkspace profile={user} hideSpoilers={preference?.hideSpoilers ?? true} notifications={notifications} />
      <div id="comptes-bloques" className="scroll-mt-28"><BlockedUsers /></div>
      <div id="import-bibliotheque" className="scroll-mt-28"><LibraryImport /></div>
      <AccountDataControls />
    </div>
  );
}
