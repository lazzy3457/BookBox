"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, PencilLine } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";

type CurrentReadCardProps = {
  bookId: string;
  title: string;
  author: string;
  thumbnailUrl: string | null;
  sinceLabel: string;
  periodId: string | null;
  page: number | null;
  pageCount: number | null;
  percentage: number | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CurrentReadCard(props: CurrentReadCardProps) {
  const router = useRouter();
  const [isNoting, setIsNoting] = useState(false);
  const [page, setPage] = useState(props.page ? String(props.page) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const percent = props.percentage ?? (props.page && props.pageCount ? Math.min(100, Math.round((props.page / props.pageCount) * 100)) : 0);
  const progressLabel = props.page
    ? `p. ${props.page}${props.pageCount ? ` / ${props.pageCount}` : ""} · ${percent} %`
    : props.percentage != null
      ? `${props.percentage} %`
      : "Pas encore de page notée";

  async function ensurePeriod() {
    if (props.periodId) return props.periodId;
    const response = await fetch("/api/reading-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "period", bookId: props.bookId, startedAt: today() })
    });
    if (!response.ok) throw new Error("Impossible de démarrer la lecture.");
    const data = await response.json();
    return data.period.id as string;
  }

  async function savePage(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(page);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Indique un numéro de page.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const periodId = await ensurePeriod();
      const response = await fetch("/api/reading-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, entryDate: today(), page: value })
      });
      if (!response.ok) throw new Error("La page n'a pas pu être enregistrée.");
      setIsNoting(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: props.bookId, status: "READ" })
    });
    setBusy(false);
    if (!response.ok) {
      setError("Impossible de marquer ce livre comme lu.");
      return;
    }
    router.refresh();
  }

  return (
    <article className="bb-card flex gap-4 p-4 sm:gap-5 sm:p-5">
      <Link href={`/books/${props.bookId}`} aria-label={props.title} className="shrink-0">
        <BookCover title={props.title} thumbnailUrl={props.thumbnailUrl} className="h-24 w-16 sm:h-[126px] sm:w-[84px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5">
        <div className="bb-label text-coral">{props.sinceLabel}</div>
        <Link href={`/books/${props.bookId}`} className="bb-h3 truncate hover:text-mint">{props.title}</Link>
        <div className="truncate text-xs text-muted sm:text-sm">{props.author}</div>
        <div className="flex flex-col gap-1.5 pt-1 sm:pt-2">
          <div className="bb-track" role="progressbar" aria-label="Progression" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-mint" style={{ width: `${percent}%` }} />
          </div>
          <div className="text-xs font-bold text-muted">{progressLabel}</div>
        </div>
        {isNoting ? (
          <form onSubmit={savePage} className="flex flex-wrap items-center gap-2 pt-2">
            <label className="sr-only" htmlFor={`page-${props.bookId}`}>Page actuelle</label>
            <input
              id={`page-${props.bookId}`}
              type="number"
              min={1}
              max={props.pageCount ?? undefined}
              value={page}
              onChange={(event) => setPage(event.target.value)}
              placeholder="Page"
              className="bb-input w-24 py-2 sm:w-28"
              autoFocus
            />
            <button type="submit" disabled={busy} className="bb-btn-primary">Enregistrer</button>
            <button type="button" onClick={() => setIsNoting(false)} className="bb-btn-ghost">Annuler</button>
          </form>
        ) : (
          <div className="flex gap-2 pt-1.5 sm:pt-2">
            <button type="button" onClick={() => setIsNoting(true)} className="bb-btn-soft px-3 sm:px-4">
              <PencilLine size={16} aria-hidden />
              Noter ma page
            </button>
            <button type="button" onClick={finish} disabled={busy} className="bb-btn-primary px-3 sm:px-4">
              <Check size={16} aria-hidden />
              J&apos;ai fini
            </button>
          </div>
        )}
        {error ? <p className="text-xs font-bold text-coral" role="alert">{error}</p> : null}
      </div>
    </article>
  );
}
