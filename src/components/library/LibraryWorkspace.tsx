"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Heart,
  ListPlus,
  MoreHorizontal,
  PencilLine,
  Search,
  Star,
  Trash2,
  Undo2,
  X,
  BookOpen,
  Check
} from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { CurrentReadCard } from "@/components/home/CurrentReadCard";
import { AddToListModal } from "@/components/lists/AddToListModal";
import { toggleFavorite } from "@/server/actions/favorites";
import { genreLabel } from "@/lib/genres";
import { daysSince, plural, timeAgo } from "@/lib/format";
import { useConfirm } from "@/components/ui/useConfirm";

export type LibraryItem = {
  id: string;
  status: ReadingStatus;
  isFavorite: boolean;
  addedAt: string;
  updatedAt: string;
  rating: number | null;
  reading: {
    periodId: string;
    startedAt: string | null;
    finishedAt: string | null;
    page: number | null;
    percentage: number | null;
  } | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    pageCount: number | null;
    genres: string[];
  };
};

type LibraryList = {
  id: string;
  title: string;
  isPublic: boolean;
  count: number;
  covers: Array<{ title: string; thumbnailUrl: string | null }>;
};

type Tab = "ALL" | ReadingStatus | "FAVORITES" | "LISTS";
type SortKey = "activity" | "added" | "finished" | "title" | "author" | "rating";

type LibraryWorkspaceProps = {
  year: number;
  stats: { readThisYear: number; pagesRead: number; reading: number; averageRating: number | null };
  items: LibraryItem[];
  lists: LibraryList[];
};

const statusLabels: Record<ReadingStatus, string> = {
  READING: "En cours",
  TO_READ: "À lire",
  READ: "Lus",
  ABANDONED: "Abandonnés"
};

const statusChoice: Record<ReadingStatus, string> = {
  READING: "En cours",
  TO_READ: "À lire",
  READ: "Lu",
  ABANDONED: "Abandonné"
};

const sortLabels: Record<SortKey, string> = {
  activity: "Activité récente",
  added: "Ajout récent",
  finished: "Lu récemment",
  title: "Titre",
  author: "Auteur",
  rating: "Ma note"
};

const SHELF_SIZE = 6;
const UNDO_DELAY = 6000;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function finishedDate(item: LibraryItem) {
  return item.reading?.finishedAt ?? item.updatedAt;
}

function metaLine(item: LibraryItem) {
  if (item.status === "READ") {
    return `Lu en ${new Date(finishedDate(item)).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  }
  if (item.status === "ABANDONED") {
    return item.reading?.page ? `Arrêté page ${item.reading.page}` : `Abandonné ${timeAgo(item.updatedAt)}`;
  }
  const days = daysSince(item.addedAt);
  if (days < 30) return `Ajouté ${timeAgo(item.addedAt)}`;
  return `Ajouté en ${new Date(item.addedAt).toLocaleDateString("fr-FR", { month: "long" })}`;
}

export function LibraryWorkspace({ year, stats, items, lists }: LibraryWorkspaceProps) {
  const [libraryItems, setLibraryItems] = useState(items);
  const [tab, setTab] = useState<Tab>("ALL");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [showAbandoned, setShowAbandoned] = useState(false);
  const [listBookId, setListBookId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ item: LibraryItem; timer: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setLibraryItems(items);
  }

  const counts = useMemo(() => {
    const byStatus = (status: ReadingStatus) => libraryItems.filter((item) => item.status === status).length;
    return {
      ALL: libraryItems.length,
      READING: byStatus("READING"),
      TO_READ: byStatus("TO_READ"),
      READ: byStatus("READ"),
      ABANDONED: byStatus("ABANDONED"),
      FAVORITES: libraryItems.filter((item) => item.isFavorite).length,
      LISTS: lists.length
    } satisfies Record<Tab, number>;
  }, [libraryItems, lists.length]);

  const topGenres = useMemo(() => {
    const tally = new Map<string, number>();
    libraryItems.forEach((item) => item.book.genres.forEach((slug) => tally.set(slug, (tally.get(slug) ?? 0) + 1)));
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([slug]) => slug);
  }, [libraryItems]);

  const terms = normalize(query).split(/\s+/).filter(Boolean);

  function sortItems(list: LibraryItem[]) {
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "added":
          return b.addedAt.localeCompare(a.addedAt);
        case "finished":
          return finishedDate(b).localeCompare(finishedDate(a));
        case "title":
          return a.book.title.localeCompare(b.book.title, "fr");
        case "author":
          return (a.book.authors[0] ?? "").localeCompare(b.book.authors[0] ?? "", "fr");
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }

  const filtered = libraryItems
    .filter((item) => genre === "ALL" || item.book.genres.includes(genre))
    .filter((item) => {
      if (!terms.length) return true;
      const haystack = normalize([item.book.title, ...item.book.authors].join(" "));
      return terms.every((term) => haystack.includes(term));
    });

  const inStatus = (status: ReadingStatus) => sortItems(filtered.filter((item) => item.status === status));

  function changeTab(next: Tab) {
    setTab(next);
    if (next === "READ") setSortKey("finished");
    else if (sortKey === "finished") setSortKey("activity");
  }

  async function changeStatus(item: LibraryItem, status: ReadingStatus) {
    setError(null);
    const previous = item.status;
    setLibraryItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status, updatedAt: new Date().toISOString() } : entry)));
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: item.book.id, status })
    });
    if (!response.ok) {
      setLibraryItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: previous } : entry)));
      setError("Le statut n'a pas pu être modifié.");
    }
  }

  async function switchFavorite(item: LibraryItem) {
    setLibraryItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry)));
    try {
      await toggleFavorite(item.book.id);
    } catch {
      setLibraryItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: item.isFavorite } : entry)));
      setError("Le coup de cœur n'a pas pu être enregistré.");
    }
  }

  async function commitRemoval(item: LibraryItem) {
    const response = await fetch(`/api/library?bookId=${encodeURIComponent(item.book.id)}`, { method: "DELETE" });
    if (!response.ok) {
      setLibraryItems((current) => [item, ...current]);
      setError(`« ${item.book.title} » n'a pas pu être retiré.`);
    }
  }

  // Le retrait n'est envoyé qu'après le délai d'annulation : « Annuler » ne perd donc ni journal ni progression.
  async function remove(item: LibraryItem) {
    if (!(await confirm({ title: `Retirer « ${item.book.title} » de ta bibliothèque ?`, message: "Son journal de lecture sera aussi supprimé. Tu auras quelques secondes pour annuler.", confirmLabel: "Retirer" }))) return;
    if (pendingRemoval) {
      window.clearTimeout(pendingRemoval.timer);
      void commitRemoval(pendingRemoval.item);
    }
    setLibraryItems((current) => current.filter((entry) => entry.id !== item.id));
    const timer = window.setTimeout(() => {
      void commitRemoval(item);
      setPendingRemoval(null);
    }, UNDO_DELAY);
    setPendingRemoval({ item, timer });
  }

  function undoRemoval() {
    if (!pendingRemoval) return;
    window.clearTimeout(pendingRemoval.timer);
    setLibraryItems((current) => [pendingRemoval.item, ...current]);
    setPendingRemoval(null);
  }

  const cardActions = {
    onStatus: changeStatus,
    onFavorite: switchFavorite,
    onList: (item: LibraryItem) => setListBookId(item.book.id),
    onRemove: (item: LibraryItem) => void remove(item)
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "ALL", label: "Tous" },
    { id: "READING", label: "En cours" },
    { id: "TO_READ", label: "À lire" },
    { id: "READ", label: "Lus" },
    { id: "ABANDONED", label: "Abandonnés" },
    { id: "FAVORITES", label: "Coups de cœur" },
    { id: "LISTS", label: "Mes listes" }
  ];

  const statCards = [
    { icon: BookOpenCheck, value: stats.readThisYear.toLocaleString("fr-FR"), label: `livres lus en ${year}` },
    { icon: FileText, value: stats.pagesRead.toLocaleString("fr-FR"), label: "pages lues" },
    { icon: BookOpen, value: stats.reading.toLocaleString("fr-FR"), label: "lectures en cours" },
    { icon: Star, value: stats.averageRating ? stats.averageRating.toFixed(1).replace(".", ",") : "—", label: "note moyenne" }
  ];

  const searching = terms.length > 0;
  const gridItems = searching
    ? sortItems(filtered)
    : tab === "FAVORITES"
      ? sortItems(filtered.filter((item) => item.isFavorite))
      : tab !== "ALL" && tab !== "LISTS"
        ? inStatus(tab)
        : [];

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      {confirmDialog}
      <h1 className="bb-page-title">Ma bibliothèque</h1>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bb-card-flat flex flex-col items-center gap-0.5 px-1.5 py-2.5 text-center sm:flex-row sm:gap-3 sm:p-5 sm:text-left">
            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/[0.08] text-mint sm:grid">
              <card.icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-display text-xl font-semibold leading-tight text-paper sm:text-[26px]">{card.value}</div>
              <div className="text-[10px] leading-tight text-muted sm:truncate sm:text-xs">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Rayons" className="bb-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            onClick={() => changeTab(item.id)}
            className={`bb-tab ${tab === item.id ? "bb-tab-active text-paper" : ""}`}
          >
            <span className={tab === item.id ? "font-extrabold text-paper" : ""}>{item.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tab === item.id ? "bg-mint text-ink" : "bg-panelSoft text-muted"}`}>{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {tab !== "LISTS" ? (
        <div className="flex flex-col gap-2.5 sm:gap-3 md:flex-row md:items-center">
          {/* Mobile : recherche et tri sur une ligne, genres en dessous ; desktop : tout sur une ligne. */}
          <div className="flex items-center gap-2 md:contents">
            <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-panel px-4 py-2 md:w-72 md:flex-none ${searching ? "border-mint" : "border-line"}`}>
              <Search size={15} aria-hidden className="shrink-0 text-muted" />
              <span className="sr-only">Rechercher dans ma bibliothèque</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, auteur…" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-muted" />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Effacer" className="text-muted hover:text-paper"><X size={14} /></button>
              ) : null}
            </label>
            <label className="relative shrink-0 md:order-last md:ml-auto">
              <span className="sr-only">Trier</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="appearance-none rounded-full border border-line bg-panel py-2 pl-3.5 pr-8 text-[13px] font-extrabold text-paper outline-none sm:pl-4 sm:pr-10">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <option key={key} value={key}>{sortLabels[key]}</option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted sm:right-4" />
            </label>
          </div>
          <div className="bb-chip-row">
            <button type="button" onClick={() => setGenre("ALL")} className={`bb-chip ${genre === "ALL" ? "bb-chip-active" : ""}`}>Tout</button>
            {!searching
              ? topGenres.map((slug) => (
                  <button key={slug} type="button" onClick={() => setGenre(slug)} className={`bb-chip ${genre === slug ? "bb-chip-active" : ""}`}>{genreLabel(slug)}</button>
                ))
              : null}
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm font-bold text-coral">{error}</p> : null}

      {searching ? (
        <section className="flex flex-col gap-4 sm:gap-5">
          <p className="text-xs text-muted">{plural(gridItems.length, "livre")} pour « {query.trim()} » dans toute ta bibliothèque</p>
          <BookGrid items={gridItems} actions={cardActions} />
          <button type="button" onClick={() => setQuery("")} className="w-fit text-xs font-extrabold text-mint hover:underline">
            Effacer la recherche pour revenir aux rayons
          </button>
        </section>
      ) : tab === "ALL" ? (
        <div className="flex flex-col gap-8 sm:gap-10">
          {libraryItems.length === 0 ? (
            <div className="bb-card flex flex-col items-start gap-3 p-6 sm:p-8">
              <p className="bb-h3">Ta bibliothèque est vide</p>
              <p className="text-sm text-muted">Lance une recherche pour ajouter ton premier livre.</p>
              <Link href="/search" className="bb-btn-primary">Trouver un livre</Link>
            </div>
          ) : null}

          {inStatus("READING").length ? (
            <ShelfSection title="En cours" count={counts.READING}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {inStatus("READING").map((item) => (
                  <ReadingCard key={item.id} item={item} />
                ))}
              </div>
            </ShelfSection>
          ) : null}

          {(["TO_READ", "READ"] as const).map((status) =>
            inStatus(status).length ? (
              <ShelfSection
                key={status}
                title={statusLabels[status] === "Lus" ? "Lus" : statusLabels[status]}
                count={counts[status]}
                action={
                  inStatus(status).length > SHELF_SIZE ? (
                    <button type="button" onClick={() => changeTab(status)} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-mint hover:underline">
                      Tout voir <ArrowRight size={14} aria-hidden />
                    </button>
                  ) : null
                }
              >
                <BookGrid items={inStatus(status).slice(0, SHELF_SIZE)} actions={cardActions} />
              </ShelfSection>
            ) : null
          )}

          {inStatus("ABANDONED").length ? (
            <section className="bb-card-flat p-5">
              <button type="button" onClick={() => setShowAbandoned((value) => !value)} aria-expanded={showAbandoned} className="flex w-full items-center gap-3 text-left">
                <h2 className="bb-h3">Abandonnés</h2>
                <span className="text-xs text-muted">{plural(counts.ABANDONED, "livre")}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-extrabold text-mint">
                  {showAbandoned ? "Masquer" : "Afficher"}
                  <ChevronDown size={15} aria-hidden className={`transition ${showAbandoned ? "rotate-180" : ""}`} />
                </span>
              </button>
              {showAbandoned ? <div className="pt-5"><BookGrid items={inStatus("ABANDONED")} actions={cardActions} /></div> : null}
            </section>
          ) : null}
        </div>
      ) : tab === "READING" ? (
        gridItems.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {gridItems.map((item) => <ReadingCard key={item.id} item={item} />)}
          </div>
        ) : (
          <EmptyTab text="Aucune lecture en cours." />
        )
      ) : tab === "LISTS" ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{plural(lists.length, "liste")}</p>
            <Link href="/lists/new" className="bb-btn-primary"><ListPlus size={16} aria-hidden />Nouvelle liste</Link>
          </div>
          {lists.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lists.map((list) => (
                <Link key={list.id} href={`/lists/${list.id}`} className="bb-card-flat group flex items-center gap-4 p-4 transition hover:border-mint/50">
                  <div className="flex -space-x-6">
                    {(list.covers.length ? list.covers : [{ title: list.title, thumbnailUrl: null }]).slice(0, 3).map((cover, index) => (
                      <BookCover key={index} title={cover.title} thumbnailUrl={cover.thumbnailUrl} className="h-[72px] w-12 border-2 border-panel shadow-poster" iconSize={0} />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-semibold text-paper group-hover:text-mint">{list.title}</p>
                    <p className="text-xs text-muted">{plural(list.count, "livre")} · {list.isPublic ? "publique" : "privée"}</p>
                  </div>
                  <ChevronRight size={16} aria-hidden className="ml-auto text-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyTab text="Tu n'as pas encore de liste." />
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4 sm:gap-5">
          <p className="text-xs text-muted">
            {plural(gridItems.length, "livre")} {tab === "FAVORITES" ? "coups de cœur" : statusLabels[tab as ReadingStatus].toLowerCase()} · triés par {sortLabels[sortKey].toLowerCase()}
          </p>
          {gridItems.length ? <BookGrid items={gridItems} actions={cardActions} /> : <EmptyTab text="Rien dans ce rayon pour l'instant." />}
        </section>
      )}

      {listBookId ? <AddToListModal bookId={listBookId} onClose={() => setListBookId(null)} /> : null}

      {pendingRemoval ? (
        <div role="status" className="fixed inset-x-3 bottom-24 z-50 flex items-center gap-3 rounded-full bg-paper py-2 pl-4 pr-2 text-[13px] font-bold text-ink shadow-poster sm:inset-x-auto sm:right-4 lg:bottom-6 lg:right-6">
          <Check size={15} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">« {pendingRemoval.item.book.title} » retiré de ta bibliothèque</span>
          <button type="button" onClick={undoRemoval} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/15 px-3 py-1.5 text-xs font-extrabold hover:bg-ink/25">
            <Undo2 size={13} aria-hidden />
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ShelfSection({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-3">
        <h2 className="bb-h2">{title}</h2>
        <span className="rounded-full bg-panelSoft px-2 py-0.5 text-[11px] font-extrabold text-muted">{count}</span>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

function EmptyTab({ text }: { text: string }) {
  return <div className="bb-card-flat p-6 text-sm text-muted">{text}</div>;
}

function ReadingCard({ item }: { item: LibraryItem }) {
  const days = daysSince(item.reading?.startedAt ?? item.updatedAt);
  return (
    <CurrentReadCard
      bookId={item.book.id}
      title={item.book.title}
      author={item.book.authors.join(", ") || "Auteur inconnu"}
      thumbnailUrl={item.book.thumbnailUrl}
      sinceLabel={days === 0 ? "Commencé aujourd'hui" : `En cours depuis ${plural(days, "jour")}`}
      periodId={item.reading?.periodId ?? null}
      page={item.reading?.page ?? null}
      pageCount={item.book.pageCount}
      percentage={item.reading?.percentage ?? null}
    />
  );
}

type CardActions = {
  onStatus: (item: LibraryItem, status: ReadingStatus) => void;
  onFavorite: (item: LibraryItem) => void;
  onList: (item: LibraryItem) => void;
  onRemove: (item: LibraryItem) => void;
};

function BookGrid({ items, actions }: { items: LibraryItem[]; actions: CardActions }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => <ShelfBook key={item.id} item={item} actions={actions} />)}
    </div>
  );
}

function ShelfBook({ item, actions }: { item: LibraryItem; actions: CardActions }) {
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setStatusOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function run(action: () => void) {
    action();
    setOpen(false);
    setStatusOpen(false);
  }

  const menuItem = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-bold text-paper transition hover:bg-ink";

  return (
    <article className="flex min-w-0 flex-col gap-1">
      <div ref={menuRef} className="relative">
        <Link href={`/books/${item.book.id}`} aria-label={item.book.title} className="block transition hover:-translate-y-1">
          <BookCover title={item.book.title} thumbnailUrl={item.book.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster" iconSize={0} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Actions pour ${item.book.title}`}
          className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-panel/95 text-paper shadow-poster transition hover:text-mint sm:right-2 sm:top-2 sm:h-7 sm:w-7"
        >
          <MoreHorizontal size={16} />
        </button>
        {open ? (
          <div role="menu" className="bb-card bb-sheet p-1.5 sm:right-2 sm:top-11 sm:z-20 sm:w-56">
            <div className="relative">
              <button type="button" role="menuitem" onClick={() => setStatusOpen((value) => !value)} className={`${menuItem} ${statusOpen ? "bg-ink" : ""}`}>
                <BookOpenCheck size={15} aria-hidden />
                Changer le statut
                <ChevronRight size={14} aria-hidden className="ml-auto" />
              </button>
              {statusOpen ? (
                <div className="flex flex-col border-l-2 border-line py-1 pl-2 ml-4">
                  {(Object.keys(statusChoice) as ReadingStatus[]).map((status) => (
                    <button key={status} type="button" role="menuitemradio" aria-checked={item.status === status} onClick={() => run(() => actions.onStatus(item, status))} className={menuItem}>
                      {statusChoice[status]}
                      {item.status === status ? <Check size={14} aria-hidden className="ml-auto text-mint" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Link role="menuitem" href={`/books/${item.book.id}#journal`} className={menuItem}>
              <PencilLine size={15} aria-hidden />
              Noter ma page
            </Link>
            <Link role="menuitem" href={`/books/${item.book.id}#avis`} className={menuItem}>
              <Star size={15} aria-hidden />
              Noter le livre
            </Link>
            <button type="button" role="menuitem" onClick={() => run(() => actions.onList(item))} className={menuItem}>
              <ListPlus size={15} aria-hidden />
              Ajouter à une liste
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => actions.onFavorite(item))} className={menuItem}>
              <Heart size={15} aria-hidden fill={item.isFavorite ? "currentColor" : "none"} className={item.isFavorite ? "text-mint" : ""} />
              {item.isFavorite ? "Retirer des coups de cœur" : "Coup de cœur"}
            </button>
            <div className="my-1 h-px bg-line" />
            <button type="button" role="menuitem" onClick={() => run(() => actions.onRemove(item))} className={`${menuItem} text-coral`}>
              <Trash2 size={15} aria-hidden />
              Retirer de ma bibliothèque
            </button>
          </div>
        ) : null}
      </div>
      <Link href={`/books/${item.book.id}`} className="truncate pt-1.5 font-display text-[13px] font-semibold text-paper hover:text-mint sm:pt-2 sm:text-[15px]">{item.book.title}</Link>
      <p className="truncate text-xs text-muted">{item.book.authors[0] ?? "Auteur inconnu"}</p>
      {item.rating ? <StarRating value={item.rating} /> : null}
      <p className="hidden text-xs font-bold text-muted sm:block">{metaLine(item)}</p>
    </article>
  );
}
