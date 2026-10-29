"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";

type Favorite = { bookId: string; title: string; author: string | null; thumbnailUrl: string | null };

const SHOWCASE_SIZE = 4;

// Choisir les coups de cœur affichés sur le profil (4 au plus) et leur ordre.
export function ShowcaseEditor({ favorites, selected }: { favorites: Favorite[]; selected: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-extrabold text-mint hover:underline">Modifier</button>
      {open ? <ShowcaseDialog favorites={favorites} selected={selected} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShowcaseDialog({ favorites, selected, onClose }: { favorites: Favorite[]; selected: string[]; onClose: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(favorites.map((favorite) => [favorite.bookId, favorite]));

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  function toggle(bookId: string) {
    setPicked((current) => (current.includes(bookId) ? current.filter((id) => id !== bookId) : current.length < SHOWCASE_SIZE ? [...current, bookId] : current));
  }

  function move(index: number, step: number) {
    setPicked((current) => {
      const next = [...current];
      const target = index + step;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/profile/showcase", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookIds: picked }) });
    setBusy(false);
    if (!response.ok) {
      setError("La vitrine n'a pas pu être enregistrée.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button type="button" aria-label="Fermer" onClick={onClose} className="fixed inset-0 bg-paper/35 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="showcase-title" className="bb-card relative flex max-h-[90vh] w-full max-w-[620px] flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="showcase-title" className="font-display text-2xl font-semibold text-paper">Livres préférés du profil</h2>
            <p className="mt-1 text-xs text-muted">Choisis jusqu&apos;à {SHOWCASE_SIZE} coups de cœur à mettre en avant. Tous les autres restent dans ta bibliothèque.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-full bg-ink text-muted hover:text-paper"><X size={15} /></button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-paper">Ordre d&apos;affichage ({picked.length}/{SHOWCASE_SIZE})</p>
          {picked.length ? (
            <ol className="flex flex-col gap-2">
              {picked.map((bookId, index) => {
                const favorite = byId.get(bookId);
                if (!favorite) return null;
                return (
                  <li key={bookId} className="flex items-center gap-3 rounded-xl bg-ink px-3 py-2">
                    <span className="w-4 text-center font-display text-lg font-semibold text-mint">{index + 1}</span>
                    <BookCover title={favorite.title} thumbnailUrl={favorite.thumbnailUrl} className="h-10 w-7 rounded" iconSize={0} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-paper">{favorite.title}</span>
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-paper disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === picked.length - 1} aria-label="Descendre" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-paper disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => toggle(bookId)} aria-label="Retirer de la vitrine" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-coral"><X size={14} /></button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-xs text-muted">Aucun livre choisi : les 4 derniers coups de cœur s&apos;affichent.</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <p className="text-xs font-extrabold text-paper">Tous mes coups de cœur ({favorites.length})</p>
          {favorites.length ? (
            <div className="grid min-h-0 grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-5">
              {favorites.map((favorite) => {
                const isPicked = picked.includes(favorite.bookId);
                const full = !isPicked && picked.length >= SHOWCASE_SIZE;
                return (
                  <button key={favorite.bookId} type="button" onClick={() => toggle(favorite.bookId)} disabled={full} aria-pressed={isPicked} title={full ? "Retire d'abord un livre de la vitrine" : favorite.title} className="relative flex flex-col gap-1 text-left disabled:opacity-40">
                    <BookCover title={favorite.title} thumbnailUrl={favorite.thumbnailUrl} showTitle className={`aspect-[2/3] w-full ${isPicked ? "ring-2 ring-mint ring-offset-2 ring-offset-panel" : ""}`} iconSize={0} />
                    {isPicked ? <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-mint text-ink"><Check size={13} /></span> : null}
                    <span className="truncate text-[11px] font-bold text-paper">{favorite.title}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">Pas encore de coup de cœur. <Link href="/library" className="font-extrabold text-mint">Va dans ta bibliothèque</Link> pour en ajouter.</p>
          )}
        </div>

        {error ? <p role="alert" className="text-xs font-bold text-coral">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bb-btn-soft px-4 py-2.5 text-sm">Annuler</button>
          <button type="button" onClick={() => void save()} disabled={busy} className="bb-btn-primary px-5 py-2.5 text-sm">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}
