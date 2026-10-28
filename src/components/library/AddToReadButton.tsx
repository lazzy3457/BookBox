"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";

type AddToReadButtonProps = {
  bookId: string;
  isSignedIn: boolean;
  initiallyAdded?: boolean;
  variant?: "primary" | "soft";
};

// Bouton « + À lire » : range le livre dans « À lire » sans quitter la page.
export function AddToReadButton({ bookId, isSignedIn, initiallyAdded = false, variant = "soft" }: AddToReadButtonProps) {
  const [added, setAdded] = useState(initiallyAdded);
  const [busy, setBusy] = useState(false);
  const className = `${variant === "primary" ? "bb-btn-primary" : "bb-btn-soft"} px-3.5 py-1.5 text-xs`;

  if (!isSignedIn) {
    return (
      <Link href="/login" className={className}>
        <Plus size={14} aria-hidden />
        À lire
      </Link>
    );
  }

  async function add() {
    setBusy(true);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, status: "TO_READ" })
    });
    setBusy(false);
    if (response.ok) setAdded(true);
  }

  return (
    <button type="button" onClick={add} disabled={busy || added} className={className}>
      {added ? <Check size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
      {added ? "Dans ta liste" : "À lire"}
    </button>
  );
}
