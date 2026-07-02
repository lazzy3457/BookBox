"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type UserMenuProps = {
  isAdmin?: boolean;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function UserMenu({ user, isAdmin = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user.name ?? "Lecteur";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BB";

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex items-center gap-2 rounded border border-line bg-panel/80 p-1.5 pr-2 text-left transition hover:border-mint/60 hover:bg-panel"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded bg-mint text-sm font-black text-ink ring-1 ring-white/10">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <ChevronDown size={15} className={`text-muted transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-56 overflow-hidden rounded border border-line bg-ink shadow-2xl shadow-black/40"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-black text-paper">{displayName}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted transition hover:bg-panel hover:text-paper"
          >
            <UserRound size={16} />
            Profil
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted transition hover:bg-panel hover:text-paper"
          >
            <Settings size={16} />
            Parametres
          </Link>
          {isAdmin ? (
            <Link
              role="menuitem"
              href="/moderation"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted transition hover:bg-panel hover:text-paper"
            >
              <ShieldCheck size={16} />
              Modération
            </Link>
          ) : null}
          <button
            role="menuitem"
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm font-bold text-muted transition hover:bg-coral/10 hover:text-coral"
          >
            <LogOut size={16} />
            Deconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}
