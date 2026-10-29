"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flame, Lock, MoreHorizontal, Quote, Trash2, UsersRound, X } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { plural } from "@/lib/format";
import { QuoteLikeButton } from "@/components/books/QuoteCard";
import { useConfirm } from "@/components/ui/useConfirm";

type JournalEntry = {
  id: string;
  entryDate: string;
  page: number | null;
  percentage: number | null;
  chapter: string | null;
  note: string | null;
  kind: "NOTE" | "QUOTE";
  isPublic: boolean;
  likes: number;
  likedByMe: boolean;
};

type JournalPeriod = {
  id: string;
  bookId: string;
  title: string;
  thumbnailUrl: string | null;
  pageCount: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  isReread: boolean;
  rating: number | null;
  entries: JournalEntry[];
};

type JournalBook = {
  bookId: string;
  title: string;
  thumbnailUrl: string | null;
  pageCount: number | null;
  status: ReadingStatus;
  periodId: string | null;
  lastPage: number | null;
};

type JournalWorkspaceProps = {
  year: number;
  isCurrentYear: boolean;
  streak: number;
  periods: JournalPeriod[];
  books: JournalBook[];
};

type DayEntry = JournalEntry & { pagesRead: number; period: JournalPeriod };
type Mode = "note" | "citation" | "page";

const monthShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const levelClasses = ["bg-panelSoft/70", "bg-coral/25", "bg-coral/60", "bg-mint/60", "bg-mint"];

function dayKey(value: string | Date) {
  return (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
}

function todayKey() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}

function level(pages: number, entries: number) {
  if (!entries) return 0;
  if (pages < 20) return 1;
  if (pages < 50) return 2;
  if (pages < 100) return 3;
  return 4;
}

function isQuote(entry: { note: string | null; kind: "NOTE" | "QUOTE" }) {
  return entry.kind === "QUOTE" && Boolean(entry.note);
}

export function JournalWorkspace({ year, isCurrentYear, streak, periods, books }: JournalWorkspaceProps) {
  const router = useRouter();
  const [bookFilter, setBookFilter] = useState("ALL");
  const [drawer, setDrawer] = useState<{ date: string; bookId: string | null } | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [entries, setEntries] = useState(periods);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sur petit écran, le calendrier défile : on l'ouvre sur les semaines récentes plutôt que sur janvier.
  useEffect(() => {
    const calendar = calendarRef.current;
    const day = calendar?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!calendar || !day || calendar.scrollWidth <= calendar.clientWidth) return;
    const offset = day.getBoundingClientRect().left - calendar.getBoundingClientRect().left;
    calendar.scrollLeft += offset - calendar.clientWidth + 48;
  }, [year]);

  const [prevPeriods, setPrevPeriods] = useState(periods);
  if (periods !== prevPeriods) {
    setPrevPeriods(periods);
    setEntries(periods);
  }

  // Pages lues par entrée : écart avec la page notée précédemment sur la même lecture.
  const dayEntries = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    entries.forEach((period) => {
      let previous = 0;
      period.entries.forEach((entry) => {
        const counts = entry.page != null && entry.kind !== "QUOTE";
        const pagesRead = counts ? Math.max(0, (entry.page ?? 0) - previous) : 0;
        if (counts) previous = entry.page ?? previous;
        if (!entry.entryDate.startsWith(String(year))) return;
        const key = dayKey(entry.entryDate);
        map.set(key, [...(map.get(key) ?? []), { ...entry, pagesRead, period }]);
      });
    });
    return map;
  }, [entries, year]);

  const finishedByDay = useMemo(() => {
    const map = new Map<string, JournalPeriod[]>();
    entries.forEach((period) => {
      if (period.finishedAt?.startsWith(String(year))) {
        const key = dayKey(period.finishedAt);
        map.set(key, [...(map.get(key) ?? []), period]);
      }
    });
    return map;
  }, [entries, year]);

  const filteredDay = (key: string) => (dayEntries.get(key) ?? []).filter((entry) => bookFilter === "ALL" || entry.period.bookId === bookFilter);

  const stats = useMemo(() => {
    const keys = [...dayEntries.keys()].sort();
    const totalPages = [...dayEntries.values()].flat().reduce((total, entry) => total + entry.pagesRead, 0);
    let longest = 0;
    let run = 0;
    let last: number | null = null;
    keys.forEach((key) => {
      const time = Date.parse(`${key}T00:00:00Z`);
      run = last !== null && time - last === 86400000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      last = time;
    });
    const notes = [...dayEntries.values()].flat().filter((entry) => entry.note).length;
    return { days: keys.length, longest, perDay: keys.length ? Math.round(totalPages / keys.length) : 0, notes };
  }, [dayEntries]);

  const weeks = useMemo(() => {
    const first = new Date(Date.UTC(year, 0, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const cursor = new Date(first.getTime() - offset * 86400000);
    const columns: Array<Array<string | null>> = [];
    while (cursor.getUTCFullYear() <= year) {
      const column: Array<string | null> = [];
      for (let day = 0; day < 7; day += 1) {
        column.push(cursor.getUTCFullYear() === year ? cursor.toISOString().slice(0, 10) : null);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      columns.push(column);
      if (cursor.getUTCFullYear() > year) break;
    }
    return columns;
  }, [year]);

  const defaultDay = useMemo(() => {
    const today = todayKey();
    if (isCurrentYear && dayEntries.has(today)) return today;
    const keys = [...dayEntries.keys()].sort();
    return keys[keys.length - 1] ?? (isCurrentYear ? today : `${year}-12-31`);
  }, [dayEntries, isCurrentYear, year]);
  const [picked, setSelected] = useState<string | null>(null);
  const selected = picked ?? defaultDay;

  const selectedEntries = filteredDay(selected);
  const selectedFinished = finishedByDay.get(selected) ?? [];
  const selectedPages = selectedEntries.reduce((total, entry) => total + entry.pagesRead, 0);
  const selectedBooks = new Set(selectedEntries.map((entry) => entry.period.bookId)).size;
  const selectedDate = new Date(`${selected}T12:00:00Z`);
  const today = todayKey();
  const reading = books.filter((book) => book.status === "READING");

  async function updateEntry(entry: DayEntry, patch: Partial<JournalEntry>) {
    const next = { ...entry, ...patch };
    const response = await fetch(`/api/reading-journal/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryDate: dayKey(next.entryDate),
        page: next.page,
        percentage: next.percentage,
        chapter: next.chapter,
        note: next.note,
        kind: next.kind,
        isPublic: next.isPublic
      })
    });
    if (response.ok) {
      setEntries((current) =>
        current.map((period) => ({ ...period, entries: period.entries.map((item) => (item.id === entry.id ? { ...item, ...patch } : item)) }))
      );
    }
  }

  async function deleteEntry(entry: DayEntry) {
    if (!(await confirm({ title: "Supprimer cette entrée de ton journal ?", message: "Cette action est définitive." }))) return;
    const response = await fetch(`/api/reading-journal/${entry.id}`, { method: "DELETE" });
    if (response.ok) {
      setEntries((current) => current.map((period) => ({ ...period, entries: period.entries.filter((item) => item.id !== entry.id) })));
    }
  }

  const monthStarts = weeks.map((column, index) => {
    const firstDay = column.find((day) => day?.endsWith("-01")) ?? null;
    return firstDay ? { index, month: Number(firstDay.slice(5, 7)) - 1 } : null;
  });

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      {confirmDialog}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="bb-page-title">Mon journal de lecture</h1>
          <p className="mt-1 text-[13px] text-muted sm:text-sm">Chaque case est un jour : plus elle est foncée, plus tu as lu.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/diary?annee=${year - 1}`} aria-label="Année précédente" className="text-muted hover:text-paper"><ChevronLeft size={18} /></Link>
            <span className="font-display text-2xl font-semibold text-paper">{year}</span>
            {isCurrentYear ? (
              <span aria-hidden className="text-line"><ChevronRight size={18} /></span>
            ) : (
              <Link href={`/diary?annee=${year + 1}`} aria-label="Année suivante" className="text-muted hover:text-paper"><ChevronRight size={18} /></Link>
            )}
          </div>
          <button type="button" onClick={() => setDrawer({ date: isCurrentYear ? today : selected, bookId: reading[0]?.bookId ?? books[0]?.bookId ?? null })} className="bb-btn-primary px-4 py-2.5 text-sm sm:px-5">
            Écrire dans mon journal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          [String(stats.days), stats.days > 1 ? "jours de lecture" : "jour de lecture"],
          [`${stats.longest} j`, "plus longue série"],
          [`${stats.perDay} p.`, "par jour de lecture"],
          [String(stats.notes), stats.notes > 1 ? "notes et citations" : "note ou citation"]
        ].map(([value, label]) => (
          <div key={label} className="bb-card-flat px-1.5 py-2.5 text-center sm:p-5 sm:text-left">
            <div className="font-display text-xl font-semibold leading-tight text-mint sm:text-[30px]">{value}</div>
            <div className="text-[10px] leading-tight text-muted sm:text-xs">{label}</div>
          </div>
        ))}
      </div>

      <section className="bb-card p-4 sm:p-5" aria-label={`Calendrier de lecture ${year}`}>
        <div ref={calendarRef} className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-full flex-col gap-1.5">
            <div className="flex gap-[3px] pl-0 text-[11px] text-muted sm:gap-[5px]">
              {weeks.map((_, index) => (
                <span key={index} className="w-[13px] shrink-0 overflow-visible whitespace-nowrap sm:w-[16px]">{monthStarts[index] ? monthShort[monthStarts[index]!.month] : ""}</span>
              ))}
            </div>
            <div className="flex gap-[3px] sm:gap-[5px]">
              {weeks.map((column, index) => (
                <div key={index} className="flex flex-col gap-[3px] sm:gap-[5px]">
                  {column.map((day, row) => {
                    if (!day) return <span key={row} className="h-[13px] w-[13px] sm:h-[16px] sm:w-[16px]" />;
                    const items = filteredDay(day);
                    const pages = items.reduce((total, entry) => total + entry.pagesRead, 0);
                    const tone = level(pages, items.length);
                    const future = isCurrentYear && day > today;
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={future}
                        onClick={() => setSelected(day)}
                        title={`${new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · ${items.length ? `${pages} pages` : "rien noté"}`}
                        aria-label={`${new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, ${items.length ? `${pages} pages` : "rien noté"}`}
                        aria-pressed={selected === day}
                        className={`h-[13px] w-[13px] rounded-[3px] sm:h-[16px] sm:w-[16px] sm:rounded-[4px] transition hover:ring-2 hover:ring-mint/40 disabled:opacity-40 ${levelClasses[tone]} ${selected === day ? "ring-2 ring-paper" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            Moins
            {levelClasses.map((className) => <span key={className} className={`h-3 w-3 rounded-[3px] ${className}`} />)}
            Plus
          </div>
          <label className="relative">
            <span className="sr-only">Filtrer par livre</span>
            <select value={bookFilter} onChange={(event) => setBookFilter(event.target.value)} className="appearance-none rounded-xl bg-ink py-2.5 pl-4 pr-10 text-[13px] font-bold text-paper outline-none">
              <option value="ALL">Tous les livres</option>
              {entries.map((period) => <option key={period.id} value={period.bookId}>{period.title}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </label>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <section className="bb-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="bb-label text-coral">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
              <h2 className="bb-h2">{selectedEntries.length ? `${plural(selectedPages, "page")} · ${plural(selectedBooks, "livre")}` : "Rien de noté ce jour-là"}</h2>
            </div>
            {books.length ? (
              <button type="button" onClick={() => setDrawer({ date: selected, bookId: selectedEntries[0]?.period.bookId ?? reading[0]?.bookId ?? books[0].bookId })} className="bb-btn-soft">
                Ajouter une entrée ce jour-là
              </button>
            ) : null}
          </div>

          {selectedEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onToggleVisibility={() => void updateEntry(entry, { isPublic: !entry.isPublic })} onDelete={() => void deleteEntry(entry)} />
          ))}

          {selectedFinished.map((period) => {
            const days = period.startedAt && period.finishedAt ? Math.max(1, Math.round((Date.parse(period.finishedAt) - Date.parse(period.startedAt)) / 86400000)) : null;
            return (
              <p key={period.id} className="flex flex-wrap items-center gap-2 text-xs">
                <CheckCircle2 size={15} aria-hidden className="text-mint" />
                <span className="font-extrabold text-paper">
                  {[period.isReread ? "Relecture terminée" : "Lecture terminée", days ? plural(days, "jour") : null, period.rating ? `noté ${period.rating}/5` : null].filter(Boolean).join(" · ")}
                </span>
                <Link href={`/books/${period.bookId}`} className="text-muted hover:text-mint">· {period.title}</Link>
              </p>
            );
          })}

          {!selectedEntries.length && !selectedFinished.length ? (
            <p className="text-sm text-muted">Choisis une case colorée du calendrier pour relire tes notes, ou ajoute une entrée.</p>
          ) : null}
        </section>

        <aside className="bb-card flex h-fit flex-col gap-4 p-4 sm:p-5">
          <h2 className="bb-h3">En cours</h2>
          {reading.length ? (
            reading.map((book) => {
              const percent = book.lastPage && book.pageCount ? Math.min(100, Math.round((book.lastPage / book.pageCount) * 100)) : 0;
              return (
                <div key={book.bookId} className="flex items-center gap-3">
                  <Link href={`/books/${book.bookId}`}><BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[60px] w-10 rounded-lg" iconSize={0} /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/books/${book.bookId}`} className="block truncate text-xs font-extrabold text-paper hover:text-mint">{book.title}</Link>
                    <div className="bb-track mt-1.5 h-1.5"><div className="h-full rounded-full bg-mint" style={{ width: `${percent}%` }} /></div>
                    <p className="mt-1 text-[11px] text-muted">{book.lastPage ? `p. ${book.lastPage}${book.pageCount ? ` / ${book.pageCount}` : ""}` : "Pas encore de page"}</p>
                  </div>
                  <button type="button" onClick={() => setDrawer({ date: today, bookId: book.bookId })} className="shrink-0 text-xs font-extrabold text-paper hover:text-mint">
                    Noter ma page
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted">Aucune lecture en cours.</p>
          )}
          {streak ? (
            <p className="flex items-start gap-2 rounded-xl bg-ink p-3 text-xs font-bold text-paper">
              <Flame size={15} aria-hidden className="mt-0.5 shrink-0 text-coral" />
              Série en cours : {plural(streak, "jour")}. Note ta page aujourd&apos;hui pour la garder.
            </p>
          ) : null}
        </aside>
      </div>

      {drawer ? (
        <JournalDrawer
          date={drawer.date}
          initialBookId={drawer.bookId}
          books={books}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function EntryCard({ entry, onToggleVisibility, onDelete }: { entry: DayEntry; onToggleVisibility: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const quote = isQuote(entry);
  return (
    <article className={`flex flex-col gap-2.5 rounded-xl p-3.5 sm:p-4 ${quote ? "bg-panelSoft/50" : "bg-ink"}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <BookCover title={entry.period.title} thumbnailUrl={entry.period.thumbnailUrl} className="h-7 w-5 rounded" iconSize={0} />
        <Link href={`/books/${entry.period.bookId}`} className="truncate text-xs font-extrabold text-paper hover:text-mint">{entry.period.title}</Link>
        <span className="hidden truncate text-[11px] text-muted min-[400px]:inline">
          {[entry.page ? `p. ${entry.page}` : null, entry.percentage != null && !entry.page ? `${entry.percentage} %` : null, entry.chapter ? `chap. ${entry.chapter}` : null].filter(Boolean).map((part) => `· ${part}`).join(" ")}
        </span>
        <button type="button" onClick={onToggleVisibility} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-muted hover:text-paper" title="Changer la visibilité">
          {entry.isPublic ? <UsersRound size={12} aria-hidden /> : <Lock size={12} aria-hidden />}
          {entry.isPublic ? "Public" : "Privé"}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Plus d'actions" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-paper">
            <MoreHorizontal size={16} />
          </button>
          {menuOpen ? (
            <div className="bb-card absolute right-0 top-8 z-10 w-44 p-1">
              <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-coral hover:bg-ink">
                <Trash2 size={14} aria-hidden />
                Supprimer
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {entry.note ? (
        quote ? (
          <p className="flex gap-2 font-display text-base font-semibold text-paper sm:text-lg"><Quote size={16} aria-hidden className="mt-1 shrink-0 text-coral" />« {entry.note} »</p>
        ) : (
          <p className="text-[13px] leading-relaxed text-paper">{entry.note}</p>
        )
      ) : null}
      {quote ? <div className="text-xs"><QuoteLikeButton entryId={entry.id} count={entry.likes} initiallyLiked={entry.likedByMe} isSignedIn /></div> : null}
    </article>
  );
}

function JournalDrawer({ date, initialBookId, books, onClose, onSaved }: { date: string; initialBookId: string | null; books: JournalBook[]; onClose: () => void; onSaved: () => void }) {
  const [bookId, setBookId] = useState(initialBookId);
  const [choosing, setChoosing] = useState(!initialBookId);
  const [mode, setMode] = useState<Mode>("note");
  const [page, setPage] = useState("");
  const [chapter, setChapter] = useState("");
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const book = books.find((item) => item.bookId === bookId) ?? null;
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const isToday = date === todayKey();

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!book) {
      setError("Choisis un livre.");
      return;
    }
    const pageValue = page ? Number(page) : null;
    const text = mode === "page" ? "" : note.trim();
    if (pageValue == null && !text && !chapter.trim()) {
      setError("Ajoute une page, un chapitre ou une note.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let periodId = book.periodId;
      if (!periodId) {
        const created = await fetch("/api/reading-journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "period", bookId: book.bookId, startedAt: date })
        });
        if (!created.ok) throw new Error("La lecture n'a pas pu démarrer.");
        periodId = (await created.json()).period.id;
      }
      const response = await fetch("/api/reading-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          entryDate: date,
          page: pageValue,
          chapter: chapter.trim() || null,
          note: text || null,
          kind: mode === "citation" ? "QUOTE" : "NOTE",
          isPublic
        })
      });
      if (!response.ok) throw new Error("L'entrée n'a pas pu être enregistrée.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-paper/30 backdrop-blur-[2px]" />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="journal-drawer-title" className="relative flex h-full w-full max-w-[520px] flex-col gap-4 overflow-y-auto bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-poster sm:gap-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="bb-label text-coral">Journal · {isToday ? "aujourd'hui" : "le"} {label}</p>
            <h2 id="journal-drawer-title" className="bb-h2">Écrire dans mon journal</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-muted hover:text-paper"><X size={20} /></button>
        </div>

        {book && !choosing ? (
          <div className="flex items-center gap-3 rounded-xl bg-ink p-3">
            <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-12 w-8 rounded-md" iconSize={0} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-semibold text-paper">{book.title}</p>
              <p className="text-[11px] text-muted">{book.status === "READING" ? "en cours" : "à lire"}{book.lastPage ? ` · dernière page notée : ${book.lastPage}` : ""}</p>
            </div>
            <button type="button" onClick={() => setChoosing(true)} className="text-xs font-extrabold text-mint hover:underline">Changer</button>
          </div>
        ) : (
          <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
            Livre
            <select value={bookId ?? ""} onChange={(event) => { setBookId(event.target.value || null); setChoosing(false); }} className="bb-input bg-ink">
              <option value="">Choisis un livre en cours ou à lire</option>
              {books.map((item) => <option key={item.bookId} value={item.bookId}>{item.title}</option>)}
            </select>
            {!books.length ? <span className="font-normal text-muted">Ajoute d&apos;abord un livre à ta bibliothèque.</span> : null}
          </label>
        )}

        <div className="flex w-fit rounded-full border border-line p-1" role="radiogroup" aria-label="Type d'entrée">
          {([["note", "Note"], ["citation", "Citation"], ["page", "Juste ma page"]] as const).map(([value, text]) => (
            <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)} className={`rounded-full px-3 py-2 text-[13px] font-extrabold transition sm:px-4 ${mode === value ? "bg-mint text-ink" : "text-paper"}`}>
              {text}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
            Page
            <input type="number" min={1} max={book?.pageCount ?? undefined} value={page} onChange={(event) => setPage(event.target.value)} placeholder={book?.lastPage ? String(book.lastPage) : ""} className="bb-input bg-ink" />
          </label>
          <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
            Chapitre
            <input value={chapter} onChange={(event) => setChapter(event.target.value)} maxLength={120} className="bb-input bg-ink" />
          </label>
        </div>

        {mode !== "page" ? (
          <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
            {mode === "citation" ? "Le passage" : "Ta note"}
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={2000} className="bb-input resize-y bg-panel" placeholder={mode === "citation" ? "Recopie la phrase qui t'a marqué…" : "Une impression, un moment, une question…"} />
          </label>
        ) : null}

        <label className="flex items-center gap-3">
          <Lock size={15} aria-hidden className="text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-paper">Partager sur mon profil</span>
            <span className="block text-[11px] text-muted">{isPublic ? "Activé : visible sur ton profil public." : "Désactivé : visible par toi uniquement."}</span>
          </span>
          <input type="checkbox" role="switch" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="peer sr-only" />
          <span aria-hidden className={`relative h-6 w-11 rounded-full transition ${isPublic ? "bg-mint" : "bg-panelSoft"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow transition ${isPublic ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </label>

        {error ? <p role="alert" className="text-xs font-bold text-coral">{error}</p> : null}

        <div className="mt-auto flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="bb-btn-ghost">Annuler</button>
          <button type="submit" disabled={busy} className="bb-btn-primary px-5 py-2.5 text-sm">{busy ? "Enregistrement…" : "Ajouter au journal"}</button>
        </div>
      </form>
    </div>
  );
}
