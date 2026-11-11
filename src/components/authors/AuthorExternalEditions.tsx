"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, SlidersHorizontal } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { Toast } from "@/components/ui/Toast";

type SourceFilter = "all" | "google_books" | "open_library";
type EditionFilter = "all" | "special" | "with_isbn" | "with_cover";

export type ExternalEdition = {
  externalId?: string;
  source?: "google_books" | "open_library";
  googleBooksVolumeId?: string;
  openLibraryKey?: string;
  isbn10?: string[];
  isbn13?: string[];
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
};

type AuthorExternalEditionsProps = {
  authorSlug: string;
  isSignedIn: boolean;
};

// Un curseur par source : chaque source reprend après son dernier livre affiché.
type Cursors = { googleStart: number; openLibraryStart: number };
type Filters = { source: SourceFilter; language: string; edition: EditionFilter };
type Group = { key: string; main: ExternalEdition; editions: ExternalEdition[] };

const PAGE_SIZE = 10;
const START_CURSORS: Cursors = { googleStart: 0, openLibraryStart: 0 };
const START_FILTERS: Filters = { source: "all", language: "all", edition: "all" };
const LANGUAGE_OPTIONS = [
  { label: "Toutes", value: "all" },
  { label: "Français", value: "fr" },
  { label: "Anglais", value: "en" },
  { label: "Espagnol", value: "es" },
  { label: "Italien", value: "it" },
  { label: "Allemand", value: "de" },
  { label: "Portugais", value: "pt" },
  { label: "Japonais", value: "ja" }
];
const languageLabels = new Map(LANGUAGE_OPTIONS.map((option) => [option.value, option.label]));
const sourceLabels: Record<string, string> = { google_books: "Google Books", open_library: "Open Library" };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bookKey(book: ExternalEdition) {
  return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? `${book.title}-${book.authors.join(",")}`;
}

function year(value?: string) {
  return value?.slice(0, 4);
}

function formatEdition(book: ExternalEdition) {
  const isbn = [...(book.isbn13 ?? []), ...(book.isbn10 ?? [])][0];
  return [
    book.publisher ?? "Éditeur inconnu",
    year(book.publishedDate),
    book.pageCount ? `${book.pageCount} pages` : null,
    book.language ? languageLabels.get(book.language) ?? book.language.toUpperCase() : null,
    isbn ? `ISBN ${isbn}` : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function groupSignature(book: ExternalEdition) {
  const author = normalizeText(book.authors[0] ?? "auteur inconnu");
  const title = normalizeText(book.title)
    .replace(/\b(tome|vol|volume|book|livre|edition|editions|roman)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${author}:${title}`;
}

// L'édition mise en avant : de préférence celle qui a une couverture.
function betterMain(current: ExternalEdition, next: ExternalEdition) {
  return !current.thumbnailUrl && next.thumbnailUrl ? next : current;
}

export function AuthorExternalEditions({ authorSlug, isSignedIn }: AuthorExternalEditionsProps) {
  const router = useRouter();
  const [items, setItems] = useState<ExternalEdition[]>([]);
  const [filters, setFilters] = useState<Filters>(START_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cursors, setCursors] = useState<Cursors>(START_CURSORS);
  const [hasMore, setHasMore] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const grouped = new Map<string, Group>();

    items.forEach((book) => {
      const key = groupSignature(book);
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { key, main: book, editions: [book] });
        return;
      }

      existing.editions.push(book);
      existing.main = betterMain(existing.main, book);
    });

    return [...grouped.values()];
  }, [items]);

  async function fetchPage(from: Cursors, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      googleStart: String(from.googleStart),
      openLibraryStart: String(from.openLibraryStart),
      ...filters
    });
    const response = await fetch(`/api/authors/${authorSlug}/books?${params.toString()}`, { signal });
    if (!response.ok) throw new Error("unavailable");
    return (await response.json()) as { items?: ExternalEdition[]; hasMore?: boolean; failedSources?: string[] } & Partial<Cursors>;
  }

  // Première page : à l'arrivée sur la page, puis à chaque changement de filtre.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFirstPage() {
      setIsLoading(true);
      setUnavailable(false);

      try {
        const payload = await fetchPage(START_CURSORS, controller.signal);
        setItems(payload.items ?? []);
        setCursors({ googleStart: payload.googleStart ?? 0, openLibraryStart: payload.openLibraryStart ?? 0 });
        setHasMore(Boolean(payload.hasMore));
        setFailedSources(payload.failedSources ?? []);
        setExpandedGroups(new Set());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setItems([]);
          setHasMore(false);
          setUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadFirstPage();

    return () => controller.abort();
    // fetchPage ne dépend que de authorSlug et des filtres, déjà listés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorSlug, filters]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const payload = await fetchPage(cursors);
      // Les sources renvoient parfois le même volume à deux index différents.
      setItems((current) => {
        const known = new Set(current.map(bookKey));
        return [...current, ...(payload.items ?? []).filter((book) => !known.has(bookKey(book)))];
      });
      setCursors({ googleStart: payload.googleStart ?? cursors.googleStart, openLibraryStart: payload.openLibraryStart ?? cursors.openLibraryStart });
      setHasMore(Boolean(payload.hasMore));
      setFailedSources(payload.failedSources ?? []);
    } catch {
      setToast({ tone: "error", message: "La suite ne répond pas pour le moment. Réessaie dans quelques instants." });
    } finally {
      setIsLoadingMore(false);
    }
  }

  function goToLogin() {
    router.push(`/login?callbackUrl=${encodeURIComponent(`/authors/${authorSlug}`)}`);
  }

  // Ouvrir une fiche enregistre le livre dans BooksBox : il faut un compte.
  async function openBook(book: ExternalEdition) {
    if (!isSignedIn) {
      goToLogin();
      return;
    }

    setSavingId(bookKey(book));
    setToast(null);

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book)
      });

      if (response.status === 401) {
        goToLogin();
        return;
      }
      if (!response.ok) throw new Error("save failed");

      const payload = (await response.json()) as { id: string };
      router.push(`/books/${payload.id}`);
    } catch {
      setToast({ tone: "error", message: "Ce livre n'a pas pu être ouvert. Réessaie." });
      setSavingId(null);
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectClass = "mt-1.5 h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm font-normal normal-case tracking-normal text-paper outline-none focus:border-mint";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-mint hover:underline"
        >
          <SlidersHorizontal size={14} aria-hidden />
          Filtrer
          <ChevronDown size={14} aria-hidden className={`transition ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {failedSources.length ? (
          <p role="status" className="text-xs text-muted">
            Résultats partiels : {failedSources.map((name) => sourceLabels[name] ?? name).join(" et ")} ne répond{failedSources.length > 1 ? "ent" : ""} pas pour le moment.
          </p>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="grid gap-3 rounded-xl bg-ink p-3 sm:grid-cols-3">
          <label className="bb-label text-muted">
            Source
            <select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value as SourceFilter })} className={selectClass}>
              <option value="all">Toutes</option>
              <option value="google_books">Google Books</option>
              <option value="open_library">Open Library</option>
            </select>
          </label>
          <label className="bb-label text-muted">
            Langue
            <select value={filters.language} onChange={(event) => setFilters({ ...filters, language: event.target.value })} className={selectClass}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="bb-label text-muted">
            Édition
            <select value={filters.edition} onChange={(event) => setFilters({ ...filters, edition: event.target.value as EditionFilter })} className={selectClass}>
              <option value="all">Toutes</option>
              <option value="special">Intégrales, éditions spéciales</option>
              <option value="with_isbn">Avec ISBN</option>
              <option value="with_cover">Avec couverture</option>
            </select>
          </label>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[84px] animate-pulse rounded-xl bg-panelSoft/70" />
          ))}
        </div>
      ) : groups.length ? (
        <ul className="divide-y divide-line">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const isSaving = savingId === bookKey(group.main);

            return (
              <li key={group.key} className="py-3">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <button type="button" onClick={() => void openBook(group.main)} disabled={isSaving} className="shrink-0 transition hover:-translate-y-0.5" aria-label={`Ouvrir la fiche de ${group.main.title}`}>
                    <BookCover title={group.main.title} thumbnailUrl={group.main.thumbnailUrl} className="h-[72px] w-12 rounded-md" iconSize={0} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => void openBook(group.main)} disabled={isSaving} className="block max-w-full truncate text-left font-display text-[15px] font-semibold text-paper hover:text-mint">
                      {group.main.title}
                    </button>
                    <p className="truncate text-[11px] text-muted">{formatEdition(group.main)}</p>
                    {group.editions.length > 1 ? (
                      <button type="button" onClick={() => toggleGroup(group.key)} aria-expanded={isExpanded} className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-mint hover:underline">
                        {group.editions.length} éditions
                        <ChevronDown size={12} aria-hidden className={`transition ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => void openBook(group.main)} disabled={isSaving} className="bb-btn-outline shrink-0 px-3 py-1.5 text-xs text-mint disabled:cursor-wait disabled:opacity-60">
                    {isSaving ? <Loader2 size={14} aria-hidden className="animate-spin" /> : null}
                    <span className="hidden min-[400px]:inline">{isSaving ? "Ouverture…" : "Voir la fiche"}</span>
                    {isSaving ? null : <ChevronRight size={14} aria-hidden className="min-[400px]:hidden" />}
                  </button>
                </div>

                {isExpanded ? (
                  <ul className="mt-2 flex flex-col gap-1.5 pl-[60px] sm:pl-16">
                    {group.editions.map((book) => (
                      <li key={bookKey(book)}>
                        <button
                          type="button"
                          onClick={() => void openBook(book)}
                          disabled={savingId === bookKey(book)}
                          className="flex w-full min-w-0 items-center gap-2 rounded-xl bg-ink px-3 py-2 text-left text-xs text-paper transition hover:text-mint disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="min-w-0 flex-1 truncate">{formatEdition(book)}</span>
                          {savingId === bookKey(book) ? <Loader2 size={12} aria-hidden className="shrink-0 animate-spin" /> : <ChevronRight size={12} aria-hidden className="shrink-0" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-ink p-4 text-sm text-muted">
          {unavailable
            ? "Google Books et Open Library ne répondent pas pour le moment. Réessaie dans quelques instants."
            : "Aucun autre livre trouvé avec ces filtres."}
        </p>
      )}

      {hasMore && !isLoading ? (
        <button type="button" onClick={() => void loadMore()} disabled={isLoadingMore} className="bb-btn-outline w-fit px-5 py-2.5 text-sm text-mint">
          {isLoadingMore ? "Chargement…" : "Voir plus de livres"}
        </button>
      ) : null}
    </div>
  );
}
