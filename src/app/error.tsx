"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl rounded border border-coral/30 bg-panel/80 p-8 text-center shadow-poster sm:p-12">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-coral">Un imprévu est survenu</div>
      <h1 className="mt-2 text-3xl font-black text-paper">Impossible d’afficher cette page.</h1>
      <p className="mt-3 text-muted">Tes données ne sont pas perdues. Tu peux simplement réessayer.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex items-center gap-2 rounded bg-mint px-5 py-3 text-sm font-black text-ink"
      >
        <RotateCcw size={16} /> Réessayer
      </button>
    </section>
  );
}
