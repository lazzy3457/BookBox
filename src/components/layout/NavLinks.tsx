"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Library, Search, Sparkles, UsersRound } from "lucide-react";

export const navItems = [
  { href: "/", label: "Accueil", mobileLabel: "Accueil", icon: Sparkles },
  { href: "/search", label: "Recherche", mobileLabel: "Recherche", icon: Search },
  { href: "/library", label: "Bibliothèque", mobileLabel: "Biblio", icon: Library },
  { href: "/diary", label: "Journal", mobileLabel: "Journal", icon: CalendarDays },
  { href: "/commu", label: "Commu", mobileLabel: "Commu", icon: UsersRound },
  { href: "/trending", label: "Tendance", mobileLabel: "Top", icon: BookOpen }
];

// La barre du bas garde 5 entrées pour rester lisible ; Tendances reste accessible depuis l'accueil et le menu du compte.
const mobileNavItems = navItems.filter((item) => item.href !== "/trending");

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-bold transition xl:gap-2 xl:px-3 ${
              active ? "bg-mint/[0.07] text-mint" : "text-paper hover:bg-panelSoft/60"
            }`}
          >
            <item.icon size={16} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-poster backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-[11px] font-extrabold transition ${
                active ? "bg-mint/[0.08] text-mint" : "text-muted hover:text-paper"
              }`}
            >
              <item.icon size={18} aria-hidden />
              <span className="w-full truncate text-center">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
