import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { LibraryImport } from "@/components/settings/LibraryImport";

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

  return (
    <div>
      <SectionHeader
        eyebrow="Compte"
        title="Parametres"
        description="Reglages desktop pour ton experience BooksBox : confort, spoilers, notifications et donnees de compte."
      />

      <section className="mb-7 rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded border border-line bg-ink text-3xl font-black text-mint">
            {(session.user.name ?? "B").slice(0, 1)}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Session active</div>
            <h2 className="mt-2 text-2xl font-black text-paper">{session.user.name ?? "Lecteur BooksBox"}</h2>
            <p className="mt-1 text-sm text-muted">{session.user.email}</p>
          </div>
        </div>
      </section>

      <SettingsPanel />
      <LibraryImport />
    </div>
  );
}
