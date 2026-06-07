import Link from "next/link";
import { BookOpen, Library, Search, Sparkles, UsersRound } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

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
  { href: "/library", label: "Bibliotheque", icon: Library },
  { href: "/commu", label: "Commu", icon: UsersRound },
  { href: "/trending", label: "Tendance", icon: BookOpen }
];

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1520px] items-center gap-5 px-5 py-3 xl:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded bg-mint text-ink shadow-glow">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="text-lg font-black tracking-normal text-paper">BooksBox</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mint/80">social reading</div>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 lg:flex">
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

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/search"
              className="hidden rounded bg-mint px-4 py-2 text-sm font-black text-ink transition hover:bg-lime sm:inline-flex"
            >
              Ajouter un livre
            </Link>
            {user ? (
              <UserMenu user={user} />
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

      <main className="mx-auto min-h-screen max-w-[1520px] px-5 py-7 xl:px-10">{children}</main>
    </div>
  );
}
