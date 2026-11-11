"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PageCountPromptProps = {
  bookId: string;
  // Dernière page notée : le livre ne peut pas en compter moins.
  minimum?: number | null;
  // Nombre de pages actuel : présent seulement pour la correction par un admin.
  current?: number | null;
};

// Deux usages : un lecteur renseigne un nombre de pages qu'aucune source ne
// connaît (sans lui, une page notée ne peut pas devenir un pourcentage), ou
// un admin corrige un nombre erroné (`current`).
export function PageCountPrompt({ bookId, minimum, current }: PageCountPromptProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ? String(current) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `page-count-${bookId}`;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const pageCount = Number(value);
    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      setError("Indique un nombre de pages.");
      return;
    }
    if (minimum && pageCount < minimum) {
      setError(`Tu as déjà noté la page ${minimum}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageCount })
      });
      // 409 : quelqu'un vient de le renseigner, il suffit de recharger.
      if (!response.ok && response.status !== 409) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Le nombre de pages n'a pas pu être enregistré.");
      }
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-left text-xs font-extrabold text-mint hover:underline">
        {current ? "Corriger le nombre de pages (admin)" : "Indiquer le nombre de pages pour voir ta progression"}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-bold text-muted">Nombre de pages du livre</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={minimum ?? 1}
          max={20000}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ex. 320"
          className="bb-input w-28 min-w-0 py-2"
          autoFocus
        />
        <button type="submit" disabled={busy} className="bb-btn-primary">Enregistrer</button>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="bb-btn-ghost px-3">Annuler</button>
      </div>
      {error ? <p className="text-xs font-bold text-coral" role="alert">{error}</p> : null}
    </form>
  );
}
