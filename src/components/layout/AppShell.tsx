import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";
import { DesktopNav, MobileNav } from "@/components/layout/NavLinks";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BrandMark } from "@/components/ui/BrandMark";

type AppShellProps = {
  children: React.ReactNode;
  isAdmin?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function AppShell({ children, user, isAdmin = false }: AppShellProps) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-full bg-mint px-4 py-2 font-extrabold text-ink transition focus:translate-y-0">Aller au contenu</a>
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[1440px] items-center gap-3 px-4 py-2 sm:min-h-16 sm:gap-5 sm:px-6 sm:py-3 xl:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <BrandMark className="h-9 w-10 sm:h-10 sm:w-11" />
            <div className="min-w-0">
              <div className="font-display text-base font-semibold leading-tight text-paper sm:text-lg">BooksBox</div>
              <div className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted sm:block">social reading</div>
            </div>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/search" className="bb-btn-primary hidden sm:inline-flex">
              Ajouter un livre
            </Link>
            {user ? (
              <UserMenu user={user} isAdmin={isAdmin} />
            ) : (
              <div className="flex gap-2">
                <Link className="bb-btn border border-line text-muted hover:text-paper" href="/login">
                  Connexion
                </Link>
                <Link className="bb-btn hidden bg-panel text-paper shadow-sm hover:text-mint sm:inline-flex" href="/signup">
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto min-h-screen max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 sm:pt-7 xl:px-10">{children}</main>
      <SiteFooter />
      <MobileNav />
    </div>
  );
}
