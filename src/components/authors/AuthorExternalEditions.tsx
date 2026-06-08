"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
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
};

const PAGE_SIZE = 10;
const LANGUAGE_OPTIONS = [
  { label: "Toutes", value: "all" },
  { label: "Francais", value: "fr" },
  { label: "Anglais", value: "en" },
  { label: "Espagnol", value: "es" },
  { label: "Italien", value: "it" },
  { label: "Allemand", value: "de" }
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bookKey(book: ExternalEdition) {
  return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? `${book.title}-${book.authors.join(",")}`;
}

function sourceLabel(book: ExternalEdition) {
  return book.source === "open_library" ? "Open Library" : "Google Books";
}

function formatEdition(book: ExternalEdition) {
  return [book.publisher, book.publishedDate, book.pageCount ? `${book.pageCount} pages` : null, book.language?.toUpperCase()]
    .filter(Boolean)
    .join(" - ");
}

function formatIsbn(book: ExternalEdition) {
  const isbn = [...(book.isbn13 ?? []), ...(book.isbn10 ?? [])][0];
  return isbn ? `ISBN ${isbn}` : null;
}

function hasSpecialEditionSignal(book: ExternalEdition) {
  const text = normalizeText([book.title, book.publisher, book.description].filter(Boolean).join(" "));
  return ["integrale", "epoque", "deluxe", "collector", "illustre", "illustrated", "omnibus"].some((word) => text.includes(word));
}

function groupSignature(book: ExternalEdition) {
  const author = normalizeText(book.authors[0] ?? "auteur inconnu");
  const title = normalizeText(book.title)
    .replace(/\b(tome|vol|volume|book|livre|edition|editions|roman)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${author}:${title}`;
}

function paginationItems(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter((page) => page >= 1 && page <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

export function AuthorExternalEditions({ authorSlug }: AuthorExternalEditionsProps) {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ExternalEdition[]>([]);
  const [source, setSource] = useState<SourceFilter>("all");
  const [language, setLanguage] = useState("all");
  const [edition, setEdition] = useState<EditionFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const visiblePages = paginationItems(currentPage, totalPages);
  const groups = useMemo(() => {
    const grouped = new Map<string, { key: string; main: ExternalEdition; editions: ExternalEdition[] }>();

    items.forEach((book) => {
      const key = groupSignature(book);
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { key, main: book, editions: [book] });
        return;
      }

      existing.editions.push(book);
    });

    return [...grouped.values()];
  }, [items]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEditions() {
      setIsLoading(true);
      setToast(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(PAGE_SIZE),
          source,
          language: language || "all",
          edition
        });
        const response = await fetch(`/api/authors/${authorSlug}/books?${params.toString()}`, {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          setItems([]);
          setTotalItems(0);
          setToast({ tone: "error", message: "Les editions externes ne repondent pas pour le moment." });
          return;
        }

        setItems(payload.items ?? []);
        setTotalItems(payload.totalItems ?? 0);
        setExpandedGroups(new Set());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setItems([]);
          setTotalItems(0);
          setToast({ tone: "error", message: "Les editions externes ne repondent pas pour le moment." });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadEditions();

    return () => controller.abort();
  }, [authorSlug, currentPage, edition, language, source]);

  function updateFilters(nextSource = source, nextLanguage = language, nextEdition = edition) {
    setSource(nextSource);
    setLanguage(nextLanguage);
    setEdition(nextEdition);
    setCurrentPage(1);
    setPageInput("1");
  }

  function changePage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    if (nextPage === currentPage) {
      return;
    }

    setCurrentPage(nextPage);
    setPageInput(String(nextPage));
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goToTypedPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedPage = Number(pageInput);

    if (!Number.isFinite(requestedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    changePage(Math.trunc(requestedPage));
  }

  async function openBook(book: ExternalEdition) {
    setSavingId(bookKey(book));
    setToast(null);

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error("Ce livre n'a pas pu etre ouvert. Reessaie.");
      }

      router.push(`/books/${payload.id}`);
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Ce livre n'a pas pu etre ouvert. Reessaie."
      });
    } finally {
      setSavingId(null);
    }
  }

  function renderEdition(book: ExternalEdition, compact = false) {
    const key = bookKey(book);
    const isSaving = savingId === key;

    return (
      <article className={`rounded border border-line bg-panel/85 p-4 shadow-poster ${compact ? "bg-ink/45" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="cover-sheen grid h-36 w-24 shrink-0 place-items-center overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
            {book.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="text-white/30" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-mint/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-mint">
                {sourceLabel(book)}
              </span>
              {hasSpecialEditionSignal(book) ? (
                <span className="rounded bg-amber/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber">
                  Edition
                </span>
              ) : null}
            </div>
            <h3 className="text-lg font-black leading-tight text-paper">{book.title}</h3>
            <p className="mt-1 text-sm text-muted">{book.authors.join(", ") || "Auteur inconnu"}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
              {formatEdition(book) ? <span className="rounded border border-line bg-ink px-2 py-1">{formatEdition(book)}</span> : null}
              {formatIsbn(book) ? <span className="rounded border border-line bg-ink px-2 py-1">{formatIsbn(book)}</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openBook(book)}
            disabled={isSaving}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded border border-line bg-ink px-3 text-xs font-black text-paper transition hover:border-mint hover:text-mint disabled:cursor-wait disabled:opacity-60 sm:w-36"
          >
            <Plus size={14} />
            {isSaving ? "Ouverture..." : "Voir la fiche"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div ref={sectionRef} className="scroll-mt-24">
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded border border-line bg-ink px-3 text-sm font-black text-paper transition hover:border-mint hover:text-mint"
        >
          <SlidersHorizontal size={16} />
          Filtres
          <ChevronDown size={16} className={`transition ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        <p className="text-xs font-bold text-muted">10 editions par page</p>
      </div>

      {filtersOpen ? (
        <div className="mb-5 grid gap-3 rounded border border-line bg-panel/70 p-4 md:grid-cols-3">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
            Source
            <select
              value={source}
              onChange={(event) => updateFilters(event.target.value as SourceFilter, language, edition)}
              className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
            >
              <option value="all">Toutes</option>
              <option value="google_books">Google Books</option>
              <option value="open_library">Open Library</option>
            </select>
          </label>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
            Langue
            <input
              list="author-language-options"
              value={language}
              onChange={(event) => updateFilters(source, event.target.value.trim() || "all", edition)}
              className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
              placeholder="Toutes, Francais, Anglais..."
            />
            <datalist id="author-language-options">
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </label>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
            Edition
            <select
              value={edition}
              onChange={(event) => updateFilters(source, language, event.target.value as EditionFilter)}
              className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
            >
              <option value="all">Toutes</option>
              <option value="special">Integrales / epoques</option>
              <option value="with_isbn">Avec ISBN</option>
              <option value="with_cover">Avec couverture</option>
            </select>
          </label>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded border border-line bg-panel/65" />
          ))}
        </div>
      ) : groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const editions = group.editions.filter((book) => bookKey(book) !== bookKey(group.main));

            return (
              <div key={group.key} className="space-y-2">
                {renderEdition(group.main)}
                {group.editions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) {
                          next.delete(group.key);
                        } else {
                          next.add(group.key);
                        }
                        return next;
                      })
                    }
                    className="inline-flex h-9 items-center gap-2 rounded border border-line bg-ink px-3 text-xs font-black text-paper transition hover:border-mint hover:text-mint"
                  >
                    {isExpanded ? "Masquer les editions" : `Voir les editions (${group.editions.length})`}
                    <ChevronDown size={14} className={`transition ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                ) : null}
                {isExpanded && editions.length ? (
                  <div className="space-y-2 border-l border-line pl-3">
                    {editions.map((book) => (
                      <div key={bookKey(book)}>{renderEdition(book, true)}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
          Aucune edition externe trouvee avec ces filtres.
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination editions externes">
          <button
            type="button"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="grid h-10 w-10 place-items-center rounded border border-line bg-ink text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-40"
            aria-label="Page precedente"
          >
            <ChevronLeft size={16} />
          </button>
          {visiblePages.map((page, index) =>
            page === "ellipsis" ? (
              <span key={`external-ellipsis-${index}`} className="px-2 text-muted">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => changePage(page)}
                disabled={isLoading}
                className={`h-10 min-w-10 rounded border px-3 text-sm font-black transition ${
                  currentPage === page ? "border-mint bg-mint text-ink" : "border-line bg-ink text-paper hover:border-mint hover:text-mint"
                }`}
              >
                {page}
              </button>
            )
          )}
          <form onSubmit={goToTypedPage} className="flex items-center gap-2 sm:ml-2">
            <label htmlFor="author-external-page" className="text-xs font-bold text-muted">
              Page
            </label>
            <input
              id="author-external-page"
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="h-10 w-16 rounded border border-line bg-ink px-2 text-center text-sm font-black text-paper outline-none transition focus:border-mint"
              inputMode="numeric"
              min={1}
              max={totalPages}
              type="number"
            />
            <span className="text-xs font-bold text-muted">/ {totalPages}</span>
          </form>
          <button
            type="button"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="grid h-10 w-10 place-items-center rounded border border-line bg-ink text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-40"
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
