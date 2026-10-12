"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Search, UserCheck } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { GENRES, genreLabel } from "@/lib/genres";
import { isReleased, monthHeading, parseReleaseDate, shortMonthLabel } from "@/lib/releaseDates";
import type { ReleaseCalendarItem } from "@/server/services/releaseCalendar";

type ReleaseCalendarProps = {
  today: string;
  items: ReleaseCalendarItem[];
  followedAuthors: string[];
  isSignedIn: boolean;
};

type Period = "upcoming" | "released";

const selectClass =
  "h-10 w-full rounded border border-line bg-panel px-3 text-sm font-bold text-paper outline-none transition focus:border-mint";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ReleaseCalendar({ today, items, followedAuthors, isSignedIn }: ReleaseCalendarProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("upcoming");
  const [year, setYear] = useState("all");
  const [genre, setGenre] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const years = useMemo(
    () => [...new Set(items.map((item) => item.releaseDate.slice(0, 4)))].sort(),
    [items]
  );

  const groups = useMemo(() => {
    const search = normalizeText(query.trim());
    const filtered = items.filter((item) => {
      const date = parseReleaseDate(item.releaseDate);
      if (!date) return false;
      if ((period === "released") !== isReleased(date, today)) return false;
      if (year !== "all" && String(date.year) !== year) return false;
      if (genre !== "all" && !item.genres.includes(genre)) return false;
      if (onlyFollowed && !item.followedAuthors.length) return false;
      if (search && !normalizeText(`${item.title} ${item.authors.join(" ")}`).includes(search)) return false;
      return true;
    });

    // À venir : la plus proche en premier. Déjà sortis : la plus récente en premier.
    if (period === "released") filtered.reverse();

    const byMonth = new Map<string, ReleaseCalendarItem[]>();
    for (const item of filtered) {
      const month = item.releaseDate.slice(0, 7);
      byMonth.set(month, [...(byMonth.get(month) ?? []), item]);
    }
    return [...byMonth.entries()];
  }, [items, period, year, genre, onlyFollowed, query, today]);

  async function openExternal(item: ReleaseCalendarItem) {
    if (!item.external) return;
    if (!isSignedIn) {
      setToast({ tone: "info", message: "Connecte-toi pour ouvrir la fiche de ce livre." });
      return;
    }

    setOpeningKey(item.key);
    setToast(null);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.external)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error();
      router.push(`/books/${payload.id}`);
    } catch {
      setToast({ tone: "error", message: "Ce livre n'a pas pu être ouvert. Réessaie." });
      setOpeningKey(null);
    }
  }

  return (
    <div className="min-w-0">
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-end">
          <label className="min-w-0 sm:w-44">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-muted">Année</span>
            <select className={selectClass} value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">Toutes</option>
              {years.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 sm:w-52">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-muted">Genre</span>
            <select className={selectClass} value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option value="all">Tous</option>
              {GENRES.map((item) => (
                <option key={item.slug} value={item.slug}>{item.label}</option>
              ))}
            </select>
          </label>
          <div className="flex h-10 rounded border border-line bg-panel p-1 min-[420px]:col-span-2 sm:col-span-1" role="group" aria-label="Période">
            {([["upcoming", "À venir"], ["released", "Déjà sortis"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`flex-1 rounded px-3 text-xs font-black transition sm:flex-none ${
                  period === value ? "bg-mint text-ink" : "text-muted hover:text-paper"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <label className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
            <span className="sr-only">Rechercher un titre ou un auteur</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Recherche..."
              className="h-10 w-full rounded-full border border-line bg-panel pl-4 pr-10 text-sm text-paper outline-none transition placeholder:text-muted/70 focus:border-mint"
            />
            <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </label>
          {isSignedIn ? (
            <button
              type="button"
              aria-pressed={onlyFollowed}
              onClick={() => setOnlyFollowed((value) => !value)}
              title="Seulement les auteurs de ma bibliothèque"
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black transition ${
                onlyFollowed ? "border-mint bg-mint/15 text-mint" : "border-line bg-panel text-muted hover:text-paper"
              }`}
            >
              <UserCheck size={16} />
              <span className="hidden sm:inline">Mes auteurs</span>
            </button>
          ) : null}
        </div>
      </div>

      {isSignedIn && !followedAuthors.length ? (
        <p className="mb-6 rounded border border-line bg-panel/65 px-4 py-3 text-sm text-muted">
          Ajoute des livres à ta bibliothèque : les sorties de leurs auteurs seront mises en avant ici.
        </p>
      ) : null}

      {groups.length ? (
        <div className="space-y-10">
          {groups.map(([month, monthItems]) => {
            const [groupYear, groupMonth] = month.split("-").map(Number);
            return (
              <section key={month} aria-labelledby={`month-${month}`}>
                <h2 id={`month-${month}`} className="mb-4 text-lg font-black text-paper">
                  {monthHeading(groupYear, groupMonth)}
                  <span className="ml-2 text-sm font-bold text-muted">{monthItems.length}</span>
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {monthItems.map((item) => (
                    <ReleaseCard
                      key={item.key}
                      item={item}
                      isOpening={openingKey === item.key}
                      onOpenExternal={() => openExternal(item)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded border border-line bg-panel/65 p-5 text-sm text-muted sm:p-8">
          {period === "upcoming" ? "Aucune sortie à venir ne correspond à ces filtres." : "Aucune sortie récente ne correspond à ces filtres."}
        </div>
      )}
    </div>
  );
}

type ReleaseCardProps = {
  item: ReleaseCalendarItem;
  isOpening: boolean;
  onOpenExternal: () => void;
};

function ReleaseCard({ item, isOpening, onOpenExternal }: ReleaseCardProps) {
  const date = parseReleaseDate(item.releaseDate);
  const isFollowed = item.followedAuthors.length > 0;

  const body = (
    <div className="group min-w-0">
      <div
        className={`cover-sheen relative aspect-[2/3] overflow-hidden rounded border bg-panel shadow-poster transition group-hover:-translate-y-1 ${
          isFollowed ? "border-mint ring-2 ring-mint/70" : "border-line group-hover:border-mint/70"
        }`}
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-between bg-gradient-to-br from-slateCard via-panel to-ink p-4">
            <BookOpen className="text-mint/60" />
            <div className="line-clamp-4 text-base font-black leading-tight text-paper">{item.title}</div>
          </div>
        )}
        {item.isPopular ? (
          <div className="absolute right-0 top-0 rounded-bl bg-amber px-1.5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink [writing-mode:vertical-rl]">
            Populaire
          </div>
        ) : null}
        {isFollowed ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-ink via-ink/85 to-transparent px-2 pb-2 pt-6 text-[11px] font-black text-mint">
            <UserCheck size={13} className="shrink-0" />
            <span className="truncate">Ton auteur</span>
          </div>
        ) : null}
        {isOpening ? <div className="absolute inset-0 grid place-items-center bg-ink/70 text-xs font-black text-paper">Ouverture...</div> : null}
      </div>

      {date ? (
        <div className="mt-2 flex items-baseline gap-2 text-paper">
          <span className="text-3xl font-black leading-none tabular-nums">{date.day ?? "—"}</span>
          <span className="h-5 w-px self-center bg-muted/60" aria-hidden />
          <span className="text-sm font-black tracking-[0.08em]">{shortMonthLabel(date.month)}</span>
          {date.day === null ? <span className="text-[10px] font-bold text-muted">date à préciser</span> : null}
        </div>
      ) : null}
      <h3 className="mt-2 line-clamp-2 text-sm font-black leading-tight text-paper">{item.title}</h3>
      <p className={`mt-1 line-clamp-1 text-xs ${isFollowed ? "font-bold text-mint" : "text-muted"}`}>
        {item.authors.join(", ") || "Auteur inconnu"}
      </p>
      {item.genres[0] ? <p className="mt-1 text-[11px] font-bold text-muted/80">{genreLabel(item.genres[0])}</p> : null}
    </div>
  );

  if (item.bookId) {
    return (
      <Link href={`/books/${item.bookId}`} className="block min-w-0">
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onOpenExternal} disabled={isOpening} className="block min-w-0 text-left disabled:cursor-wait">
      {body}
    </button>
  );
}
