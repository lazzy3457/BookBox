import Link from "next/link";
import { BookOpen, Library, Search, Sparkles, UserRound, UsersRound } from "lucide-react";
import { SessionButton } from "@/components/auth/SessionButton";

type AppShellProps = {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

const navItems = [
  { href: "/", label: "Accueil", icon: Sparkles },
  { href: "/search", label: "Recherche", icon: Search },
  { href: "/library", label: "Bibliothèque", icon: Library },
  { href: "/commu", label: "Commu", icon: UsersRound },
  { href: "/trending", label: "Tendance", icon: BookOpen },
  { href: "/profile", label: "Profil", icon: UserRound }
];

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/88 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-7 px-5 xl:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded bg-mint text-ink shadow-glow">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="text-lg font-black tracking-normal text-paper">BooksBox</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mint/80">social reading</div>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-bold text-muted transition hover:bg-white/7 hover:text-paper"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 xl:flex">
            <Link href="/search" className="rounded bg-mint px-4 py-2 text-sm font-black text-ink transition hover:bg-lime">
              Ajouter un livre
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="rounded border border-line bg-panel px-3 py-2 text-right">
                  <div className="text-xs font-black text-paper">{user.name ?? "Lecteur"}</div>
                  <div className="max-w-44 truncate text-[11px] text-muted">{user.email}</div>
                </div>
                <SessionButton />
              </div>
            ) : (
              <div className="flex gap-2">
                <Link className="rounded border border-line px-3 py-2 text-xs font-bold text-muted hover:text-paper" href="/login">
                  Connexion
                </Link>
                <Link className="rounded bg-white px-3 py-2 text-xs font-black text-ink" href="/signup">
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-10 hidden w-24 border-r border-line bg-ink/40 px-3 py-24 backdrop-blur 2xl:block">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group grid h-14 place-items-center rounded text-muted transition hover:bg-panel hover:text-mint"
              title={item.label}
            >
              <item.icon size={20} />
            </Link>
          ))}
        </nav>
      </aside>

      <main className="mx-auto min-h-screen max-w-[1520px] px-5 py-7 xl:px-10 2xl:pl-32">
        <div className="xl:hidden">
          <div className="mb-5 flex items-center justify-between rounded border border-line bg-ink/85 px-4 py-3">
            <Link href="/" className="font-black text-paper">BooksBox</Link>
            <Link href="/search" className="rounded bg-mint px-3 py-2 text-xs font-bold text-ink">
              Recherche
            </Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
