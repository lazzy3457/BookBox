"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import { BookOpen, Check, ChevronDown, Heart, ListPlus, PencilLine, Plus, Trash2 } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { AddToListModal } from "@/components/lists/AddToListModal";
import { toggleFavorite } from "@/server/actions/favorites";

type JournalEntry = {
  id: string;
  entryDate: string;
  page: number | null;
  percentage: number | null;
  chapter: string | null;
  note: string | null;
};

type BookActionPanelProps = {
  bookId: string;
  title: string;
  thumbnailUrl: string | null;
  pageCount: number | null;
  isSignedIn: boolean;
  status: ReadingStatus | null;
  isFavorite: boolean;
  period: { id: string; startedAt: string | null; entries: JournalEntry[] } | null;
  counts: { read: number; reading: number; toRead: number };
};

const statusLabels: Record<ReadingStatus, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonné"
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function BookActionPanel(props: BookActionPanelProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(props.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorite, setFavorite] = useState(props.isFavorite);
  const [listOpen, setListOpen] = useState(false);
  const [noting, setNoting] = useState(false);
  const [page, setPage] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resynchronise le statut quand la page serveur est rafraîchie.
  const [prevStatus, setPrevStatus] = useState(props.status);
  if (props.status !== prevStatus) {
    setPrevStatus(props.status);
    setStatus(props.status);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const latest = props.period?.entries.find((entry) => entry.page != null || entry.percentage != null) ?? null;
  const percent = latest?.percentage ?? (latest?.page && props.pageCount ? Math.min(100, Math.round((latest.page / props.pageCount) * 100)) : 0);

  async function changeStatus(next: ReadingStatus) {
    setMenuOpen(false);
    setError(null);
    setBusy(true);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: props.bookId, status: next })
    });
    setBusy(false);
    if (!response.ok) {
      setError("Ta bibliothèque n'a pas pu être mise à jour.");
      return;
    }
    setStatus(next);
    router.refresh();
  }

  async function removeBook() {
    setMenuOpen(false);
    if (!window.confirm("Retirer ce livre de ta bibliothèque ? Ton journal de lecture pour ce livre sera supprimé.")) return;
    const response = await fetch(`/api/library?bookId=${encodeURIComponent(props.bookId)}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Ce livre n'a pas pu être retiré.");
      return;
    }
    setStatus(null);
    router.refresh();
  }

  async function switchFavorite() {
    setFavorite((value) => !value);
    try {
      await toggleFavorite(props.bookId);
    } catch {
      setFavorite((value) => !value);
      setError("Le coup de cœur n'a pas pu être enregistré.");
    }
  }

  async function savePage(event: React.FormEvent) {
    event.preventDefault();
    const value = page ? Number(page) : null;
    if (value != null && (!Number.isInteger(value) || value <= 0)) {
      setError("Indique un numéro de page valide.");
      return;
    }
    if (value == null && !note.trim()) {
      setError("Ajoute une page ou une note.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let periodId = props.period?.id;
      if (!periodId) {
        const created = await fetch("/api/reading-journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "period", bookId: props.bookId, startedAt: today() })
        });
        if (!created.ok) throw new Error("La lecture n'a pas pu démarrer.");
        periodId = (await created.json()).period.id;
      }
      const response = await fetch("/api/reading-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, entryDate: today(), page: value, note: note.trim() || null })
      });
      if (!response.ok) throw new Error("L'entrée n'a pas pu être enregistrée.");
      setPage("");
      setNote("");
      setNoting(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside id="journal" className="bb-card flex flex-col gap-4 p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
      <div className="mx-auto w-full max-w-[190px]">
        <BookCover title={props.title} thumbnailUrl={props.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster" iconSize={18} />
      </div>

      {!props.isSignedIn ? (
        <div className="flex flex-col gap-2 text-center">
          <Link href={`/login?callbackUrl=/books/${props.bookId}`} className="bb-btn-primary w-full py-3 text-sm">
            <Plus size={16} aria-hidden />
            Ajouter à ma bibliothèque
          </Link>
          <p className="text-xs text-muted">Connecte-toi pour suivre ta lecture et noter ce livre.</p>
        </div>
      ) : (
        <>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              disabled={busy}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="bb-btn-primary w-full py-3 text-sm"
            >
              {status ? <BookOpen size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
              {status ? statusLabels[status] : "Ajouter à ma bibliothèque"}
              <ChevronDown size={15} aria-hidden className={`ml-1 transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen ? (
              <div role="menu" className="bb-card absolute inset-x-0 top-full z-20 mt-2 p-1.5">
                {(Object.keys(statusLabels) as ReadingStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={status === value}
                    onClick={() => void changeStatus(value)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-paper hover:bg-ink"
                  >
                    {statusLabels[value]}
                    {status === value ? <Check size={15} aria-hidden className="ml-auto text-mint" /> : null}
                  </button>
                ))}
                {status ? (
                  <>
                    <div className="my-1 h-px bg-line" />
                    <button type="button" role="menuitem" onClick={() => void removeBook()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-coral hover:bg-ink">
                      <Trash2 size={15} aria-hidden />
                      Retirer de ma bibliothèque
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {status === "READING" || latest ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-paper">{latest?.page ? `p. ${latest.page}${props.pageCount ? ` / ${props.pageCount}` : ""}` : "Pas encore de page notée"}</span>
                <span className="text-mint">{percent} %</span>
              </div>
              <div className="bb-track"><div className="h-full rounded-full bg-mint" style={{ width: `${percent}%` }} /></div>
            </div>
          ) : null}

          {status ? (
            noting ? (
              <form onSubmit={savePage} className="flex flex-col gap-2 rounded-xl bg-ink p-3">
                <label className="text-xs font-bold text-muted" htmlFor="panel-page">Page atteinte</label>
                <input id="panel-page" type="number" min={1} max={props.pageCount ?? undefined} value={page} onChange={(event) => setPage(event.target.value)} className="bb-input" placeholder={latest?.page ? String(latest.page) : "Page"} autoFocus />
                <label className="text-xs font-bold text-muted" htmlFor="panel-note">Une note (facultatif)</label>
                <textarea id="panel-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={2000} className="bb-input resize-y" placeholder="Un passage, une impression…" />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="bb-btn-primary flex-1">Enregistrer</button>
                  <button type="button" onClick={() => setNoting(false)} className="bb-btn-ghost">Annuler</button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setNoting(true)} className="bb-btn-soft w-full py-2.5 text-sm">
                <PencilLine size={16} aria-hidden />
                Noter ma page
              </button>
            )
          ) : null}

          {props.period ? (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="bb-h3 text-base">Mon journal</h2>
                {props.period.startedAt ? <span className="text-[11px] text-muted">Commencé le {shortDate(props.period.startedAt)}</span> : null}
              </div>
              <ul className="flex flex-col gap-2">
                {props.period.entries.slice(0, 3).map((entry) => (
                  <li key={entry.id} className="flex gap-2.5 text-xs">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                    <span className="w-12 shrink-0 text-muted">{shortDate(entry.entryDate)}</span>
                    <span className="min-w-0">
                      <span className="font-bold text-paper">
                        {[entry.page ? `p. ${entry.page}` : null, entry.percentage != null ? `${entry.percentage} %` : null, entry.chapter].filter(Boolean).join(" · ") || "Note"}
                      </span>
                      {entry.note ? <span className="mt-0.5 block italic text-muted">« {entry.note} »</span> : null}
                    </span>
                  </li>
                ))}
                {props.period.startedAt ? (
                  <li className="flex gap-2.5 text-xs">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                    <span className="w-12 shrink-0 text-muted">{shortDate(props.period.startedAt)}</span>
                    <span className="font-bold text-paper">Commencé</span>
                  </li>
                ) : null}
              </ul>
              <Link href="/diary" className="text-xs font-extrabold text-mint hover:underline">Tout mon journal</Link>
            </section>
          ) : null}

          {status ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void switchFavorite()}
                aria-pressed={favorite}
                aria-label={favorite ? "Retirer des coups de cœur" : "Coup de cœur"}
                className={`grid h-10 w-10 place-items-center rounded-full border transition ${favorite ? "border-amber bg-amber/10 text-mint" : "border-line text-paper hover:text-mint"}`}
              >
                <Heart size={17} fill={favorite ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={() => setListOpen(true)} aria-label="Ajouter à une liste" className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper transition hover:text-mint">
                <ListPlus size={17} />
              </button>
              <span className="text-[11px] text-muted">Coup de cœur · Ajouter à une liste</span>
            </div>
          ) : null}
        </>
      )}

      {error ? <p role="alert" className="text-xs font-bold text-coral">{error}</p> : null}
      <p className="text-[11px] font-bold text-mint">
        {props.counts.read} l&apos;ont lu · {props.counts.reading} le lisent · {props.counts.toRead} veulent le lire
      </p>

      {listOpen ? <AddToListModal bookId={props.bookId} onClose={() => setListOpen(false)} /> : null}
    </aside>
  );
}
