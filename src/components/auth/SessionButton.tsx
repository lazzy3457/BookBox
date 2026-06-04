"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SessionButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-bold text-muted transition hover:border-coral hover:text-coral"
    >
      <LogOut size={14} />
      Deconnexion
    </button>
  );
}
