import Link from "next/link";
import { BookOpen, CalendarDays, Library, Search, Sparkles, UsersRound } from "lucide-react";
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
  { href: "/", label: "Accueil", mobileLabel: "Accueil", icon: Sparkles },
  { href: "/search", label: "Recherche", mobileLabel: "Search", icon: Search },
  { href: "/library", label: "Bibliotheque", mobileLabel: "Biblio", icon: Library },
  { href: "/diary", label: "Journal", mobileLabel: "Journal", icon: CalendarDays },
  { href: "/commu", label: "Commu", mobileLabel: "Commu", icon: UsersRound },
  { href: "/trending", label: "Tendance", mobileLabel: "Top", icon: BookOpen }
];

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[1520px] items-center gap-2 px-3 py-2 sm:min-h-16 sm:gap-5 sm:px-5 sm:py-3 xl:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="grid h-8 w-8 place-items-center rounded bg-mint text-ink shadow-glow sm:h-10 sm:w-10">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-normal text-paper sm:text-lg">BooksBox</div>
              <div className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-mint/80 sm:block">social reading</div>
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

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
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
                <Link className="rounded border border-line px-2.5 py-2 text-xs font-bold text-muted hover:text-paper sm:px-3" href="/login">
                  Connexion
                </Link>
                <Link className="hidden rounded bg-white px-3 py-2 text-xs font-black text-ink sm:inline-flex" href="/signup">
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-screen max-w-[1520px] px-3 py-4 sm:px-5 sm:py-7 xl:px-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-black/40 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-col items-center gap-1 rounded px-0.5 py-2 text-[10px] font-black text-muted transition hover:bg-white/7 hover:text-paper"
            >
              <item.icon size={18} />
              <span className="w-full truncate text-center">{item.mobileLabel}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
