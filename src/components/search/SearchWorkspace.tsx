"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type SearchMode = "all" | "title" | "author" | "isbn";
type SourceFilter = "all" | "google_books" | "open_library";
type EditionFilter = "all" | "special" | "with_isbn" | "with_cover";

type Candidate = {
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

type RecentBook = {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
};

type ResultGroup = {
  key: string;
  main: Candidate;
  editions: Candidate[];
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

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}

function isLikelyIsbn(value: string) {
  const normalized = normalizeIsbn(value);
  return normalized.length === 10 || normalized.length === 13;
}

function bookKey(book: Candidate) {
  return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? `${book.title}-${book.authors.join(",")}`;
}

function sourceLabel(book: Candidate) {
  return book.source === "open_library" ? "Open Library" : "Google Books";
}

function formatEdition(book: Candidate) {
  return [book.publisher, book.publishedDate, book.pageCount ? `${book.pageCount} pages` : null, book.language?.toUpperCase()]
    .filter(Boolean)
    .join(" - ");
}

function formatIsbn(book: Candidate) {
  const isbn = [...(book.isbn13 ?? []), ...(book.isbn10 ?? [])][0];
  return isbn ? `ISBN ${isbn}` : null;
}

function hasSpecialEditionSignal(book: Candidate) {
  const text = normalizeText([book.title, book.publisher, book.description].filter(Boolean).join(" "));
  return ["integrale", "epoque", "deluxe", "collector", "illustre", "illustrated", "omnibus"].some((word) => text.includes(word));
}

function groupSignature(book: Candidate) {
  const author = normalizeText(book.authors[0] ?? "auteur inconnu");
  const title = normalizeText(book.title)
    .replace(/\b(tome|vol|volume|book|livre|edition|editions|roman)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${author}:${title}`;
}

function betterMainBook(current: Candidate, next: Candidate) {
  const currentScore = (current.thumbnailUrl ? 2 : 0) + (formatIsbn(current) ? 1 : 0) + (current.publisher ? 1 : 0);
  const nextScore = (next.thumbnailUrl ? 2 : 0) + (formatIsbn(next) ? 1 : 0) + (next.publisher ? 1 : 0);
  return nextScore > currentScore ? next : current;
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

export function SearchWorkspace() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [lastSearchMode, setLastSearchMode] = useState<SearchMode>("all");
  const [language, setLanguage] = useState("all");
  const [lastLanguage, setLastLanguage] = useState("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [lastSource, setLastSource] = useState<SourceFilter>("all");
  const [editionFilter, setEditionFilter] = useState<EditionFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [items, setItems] = useState<Candidate[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [status, setStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [suggestions, setSuggestions] = useState<Candidate[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem("booksbox.searchHistory");
    return raw ? JSON.parse(raw) : [];
  });
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem("booksbox.recentBooks");
    return raw ? JSON.parse(raw) : [];
  });
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualThumbnailUrl, setManualThumbnailUrl] = useState("");
  const [manualPublishedDate, setManualPublishedDate] = useState("");
  const [manualPublisher, setManualPublisher] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");
  const [manualLanguage, setManualLanguage] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  const effectiveMode = isLikelyIsbn(query) ? "isbn" : searchMode;

  const buildSearchUrl = useCallback((searchQuery: string, page: number, mode: SearchMode, selectedLanguage: string, selectedSource: SourceFilter) => {
    const params = new URLSearchParams({
      q: searchQuery,
      startIndex: String((page - 1) * pageSize),
      pageSize: String(pageSize),
      mode,
      language: selectedLanguage || "all",
      source: selectedSource
    });

    return `/api/books/search?${params.toString()}`;
  }, [pageSize]);

  const filteredItems = useMemo(() => {
    if (editionFilter === "with_isbn") {
      return items.filter((book) => (book.isbn10?.length ?? 0) > 0 || (book.isbn13?.length ?? 0) > 0);
    }

    if (editionFilter === "with_cover") {
      return items.filter((book) => Boolean(book.thumbnailUrl));
    }

    if (editionFilter === "special") {
      return items.filter(hasSpecialEditionSignal);
    }

    return items;
  }, [editionFilter, items]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ResultGroup>();

    filteredItems.forEach((book) => {
      const key = groupSignature(book);
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { key, main: book, editions: [book] });
        return;
      }

      existing.editions.push(book);
      existing.main = betterMainBook(existing.main, book);
    });

    return [...grouped.values()];
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visiblePages = paginationItems(currentPage, totalPages);

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSuggesting(false);
    }
  }

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);

      try {
        const mode = isLikelyIsbn(normalizedQuery) ? "isbn" : searchMode;
        const response = await fetch(buildSearchUrl(normalizedQuery, 1, mode, language, source), {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions((payload.items ?? []).slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggesting(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [buildSearchUrl, language, query, searchMode, source]);

  function rememberSearch(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    const nextHistory = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
    setHistory(nextHistory);
    window.localStorage.setItem("booksbox.searchHistory", JSON.stringify(nextHistory));
  }

  function rememberBook(book: RecentBook) {
    const nextRecentBooks = [book, ...recentBooks.filter((item) => item.id !== book.id)].slice(0, 5);
    setRecentBooks(nextRecentBooks);
    window.localStorage.setItem("booksbox.recentBooks", JSON.stringify(nextRecentBooks));
  }

  async function runSearch(searchQuery: string, page: number, mode: SearchMode, selectedLanguage: string, selectedSource: SourceFilter, scrollToResults = false) {
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 2) {
      setItems([]);
      setStatus("Entre au moins 2 caracteres pour lancer la recherche.");
      return;
    }

    setIsSearching(true);
    setStatus("");
    setToast(null);
    setShowSuggestions(false);

    try {
      const response = await fetch(buildSearchUrl(normalizedQuery, page, mode, selectedLanguage, selectedSource));
      const payload = await response.json();

      if (!response.ok) {
        setStatus("La recherche ne repond pas pour le moment. Reessaie dans quelques instants.");
        return;
      }

      setLastQuery(normalizedQuery);
      setLastSearchMode(mode);
      setLastLanguage(selectedLanguage);
      setLastSource(selectedSource);
      setCurrentPage(page);
      setPageInput(String(page));
      setItems(payload.items ?? []);
      setTotalItems(payload.totalItems ?? 0);
      setPageSize(payload.pageSize ?? PAGE_SIZE);
      setExpandedGroups(new Set());
      rememberSearch(normalizedQuery);
      setStatus((payload.items ?? []).length ? "" : "Aucun livre trouve. Essaie un ISBN, un autre titre, ou l'ajout manuel.");
      if (scrollToResults) {
        window.requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } finally {
      setIsSearching(false);
    }
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const normalizedQuery = String(formData.get("q") ?? searchInputRef.current?.value ?? query).trim();
    const mode = isLikelyIsbn(normalizedQuery) ? "isbn" : searchMode;
    setQuery(normalizedQuery);
    await runSearch(normalizedQuery, 1, mode, language, source);
  }

  function selectSuggestion(book: Candidate) {
    setQuery(book.title);
    setItems([book]);
    setTotalItems(1);
    setCurrentPage(1);
    setPageInput("1");
    setStatus("");
    setSuggestions([]);
    setShowSuggestions(false);
    rememberSearch(book.title);
  }

  function changePage(page: number) {
    if (!lastQuery || page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    void runSearch(lastQuery, page, lastSearchMode, lastLanguage, lastSource, true);
  }

  function goToTypedPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedPage = Number(pageInput);

    if (!Number.isFinite(requestedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    changePage(Math.min(Math.max(Math.trunc(requestedPage), 1), totalPages));
  }

  async function addBookToLibrary(bookId: string) {
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, status: "TO_READ" })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error("Ce livre n'a pas pu etre ajoute a ta bibliotheque.");
    }

    return payload;
  }

  async function saveBook(book: Candidate) {
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book)
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error("Ce livre n'a pas pu etre ouvert. Reessaie.");
    }

    return payload;
  }

  async function openBookPage(book: Candidate) {
    const key = bookKey(book);
    setOpeningId(key);
    setToast(null);

    try {
      const savedBook = await saveBook(book);
      rememberBook({
        id: savedBook.id,
        title: savedBook.title,
        authors: savedBook.authors,
        thumbnailUrl: savedBook.thumbnailUrl
      });
      setSuggestions([]);
      setShowSuggestions(false);
      router.push(`/books/${savedBook.id}`);
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Ce livre n'a pas pu etre ouvert. Reessaie."
      });
    } finally {
      setOpeningId(null);
    }
  }

  async function persistBook(book: Candidate) {
    const key = bookKey(book);
    setSavingId(key);
    setToast(null);

    try {
      const payload = await saveBook(book);
      await addBookToLibrary(payload.id);
      rememberBook({
        id: payload.id,
        title: payload.title,
        authors: payload.authors,
        thumbnailUrl: payload.thumbnailUrl
      });
      setSavedIds((current) => new Set(current).add(key));
      setToast({ tone: "success", message: `"${payload.title}" est dans ta bibliotheque.` });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Ce livre n'a pas pu etre ajoute a ta bibliotheque."
      });
    } finally {
      setSavingId(null);
    }
  }

  async function createManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: manualTitle,
        authors: manualAuthor.split(",").map((author) => author.trim()).filter(Boolean),
        thumbnailUrl: manualThumbnailUrl || undefined,
        publishedDate: manualPublishedDate || undefined,
        publisher: manualPublisher || undefined,
        pageCount: manualPageCount ? Number(manualPageCount) : undefined,
        language: manualLanguage || undefined,
        description: manualDescription || undefined
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setToast({ tone: "error", message: "Le livre n'a pas pu etre cree. Verifie les champs." });
      return;
    }

    try {
      await addBookToLibrary(payload.id);
      rememberBook({
        id: payload.id,
        title: payload.title,
        authors: payload.authors,
        thumbnailUrl: payload.thumbnailUrl
      });
      setManualTitle("");
      setManualAuthor("");
      setManualThumbnailUrl("");
      setManualPublishedDate("");
      setManualPublisher("");
      setManualPageCount("");
      setManualLanguage("");
      setManualDescription("");
      setManualOpen(false);
      setToast({ tone: "success", message: `"${payload.title}" est cree et ajoute a ta bibliotheque.` });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Le livre est cree, mais il n'a pas pu etre ajoute a ta bibliotheque."
      });
    }
  }

  function renderBookCover(book: Candidate) {
    return (
      <div className="cover-sheen grid h-36 w-24 shrink-0 place-items-center overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
        {book.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="text-white/30" />
        )}
      </div>
    );
  }

  function renderEdition(book: Candidate, compact = false) {
    const key = bookKey(book);
    const isSaved = savedIds.has(key);
    const isSaving = savingId === key;
    const isOpening = openingId === key;

    return (
      <article className={`rounded border border-line bg-panel/85 p-4 shadow-poster ${compact ? "bg-ink/45" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row">
          {renderBookCover(book)}
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
            {book.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/65">{book.description}</p> : null}
          </div>
          <div className="flex shrink-0 flex-row gap-2 sm:w-36 sm:flex-col">
            <button
              type="button"
              onClick={() => openBookPage(book)}
              disabled={isOpening}
              className="inline-flex h-10 flex-1 items-center justify-center rounded bg-paper px-3 text-xs font-black text-ink transition hover:bg-white disabled:cursor-wait disabled:opacity-60 sm:flex-none"
            >
              {isOpening ? "Ouverture..." : "Voir la fiche"}
            </button>
            <button
              type="button"
              onClick={() => persistBook(book)}
              disabled={isSaving || isSaved}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded border border-line bg-ink px-3 text-xs font-black text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:bg-panelSoft disabled:text-muted sm:flex-none"
            >
              <Plus size={14} />
              {isSaved ? "Deja ajoute" : isSaving ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="rounded border border-line bg-panel/85 p-4 shadow-poster">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              name="q"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              className="h-12 w-full rounded border border-line bg-ink px-4 text-white outline-none transition placeholder:text-muted/45 focus:border-mint"
              placeholder="Titre, auteur ou ISBN"
            />
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-14 z-30 max-h-80 overflow-y-auto rounded border border-line bg-ink shadow-2xl shadow-black/40">
                {suggestions.map((book) => (
                  <button
                    key={bookKey(book)}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(book)}
                    className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left transition last:border-b-0 hover:bg-panel"
                  >
                    <div className="grid h-14 w-10 shrink-0 place-items-center overflow-hidden rounded border border-line bg-panelSoft">
                      {book.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Search size={15} className="text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-black text-paper">{book.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted">{book.authors.join(", ") || "Auteur inconnu"}</div>
                      <div className="mt-1 line-clamp-1 text-[11px] text-muted/70">
                        {sourceLabel(book)}
                        {formatEdition(book) ? ` - ${formatEdition(book)}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded bg-mint px-5 font-black text-ink transition hover:bg-lime disabled:cursor-wait disabled:opacity-70"
            disabled={isSearching}
          >
            <Search size={18} />
            {isSearching ? "Recherche..." : isSuggesting ? "Propositions..." : "Rechercher"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-ink px-3 text-sm font-black text-paper transition hover:border-mint hover:text-mint"
          >
            <SlidersHorizontal size={16} />
            Filtres
            <ChevronDown size={16} className={`transition ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          <div className="text-xs font-bold text-muted">
            {effectiveMode === "isbn" ? "Recherche ISBN detectee" : "Recherche simple"}
          </div>
        </div>

        {filtersOpen ? (
          <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-4">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Type
              <select
                value={searchMode}
                onChange={(event) => setSearchMode(event.target.value as SearchMode)}
                className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
              >
                <option value="all">Tout</option>
                <option value="title">Titre</option>
                <option value="author">Auteur</option>
                <option value="isbn">ISBN</option>
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Langue
              <input
                list="search-language-options"
                value={language}
                onChange={(event) => setLanguage(event.target.value.trim() || "all")}
                className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
                placeholder="Toutes, Francais, Anglais..."
              />
              <datalist id="search-language-options">
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Source
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as SourceFilter)}
                className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm normal-case tracking-normal text-paper outline-none focus:border-mint"
              >
                <option value="all">Toutes</option>
                <option value="google_books">Google Books</option>
                <option value="open_library">Open Library</option>
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-muted">
              Edition
              <select
                value={editionFilter}
                onChange={(event) => setEditionFilter(event.target.value as EditionFilter)}
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
      </form>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      {!lastQuery && !isSearching ? (
        <section className="rounded border border-line bg-panel/65 p-6 text-sm leading-6 text-muted">
          Cherche un livre, un auteur ou un ISBN. Les editions trouvees dans Google Books et Open Library seront regroupees pour rester lisibles.
        </section>
      ) : null}

      {status ? <p className="rounded border border-line bg-panelSoft px-4 py-3 text-sm text-muted">{status}</p> : null}

      {isSearching ? (
        <div ref={resultsRef} className="space-y-3 scroll-mt-24">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded border border-line bg-panel/65" />
          ))}
        </div>
      ) : groups.length ? (
        <section ref={resultsRef} className="space-y-4 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-paper">Resultats</h2>
              <p className="mt-1 text-sm text-muted">
                {groups.length} resultat{groups.length > 1 ? "s" : ""} sur cette page
                {totalItems ? ` - environ ${totalItems} resultat${totalItems > 1 ? "s" : ""}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManualOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded border border-line bg-ink px-3 text-sm font-black text-paper transition hover:border-mint hover:text-mint"
            >
              <Plus size={16} />
              Livre introuvable ?
            </button>
          </div>

          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const editions = group.editions.filter((book) => bookKey(book) !== bookKey(group.main));

            return (
              <div key={group.key} className="space-y-2">
                <div className="relative">
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
                      className="mt-2 inline-flex h-9 items-center gap-2 rounded border border-line bg-ink px-3 text-xs font-black text-paper transition hover:border-mint hover:text-mint"
                    >
                      {isExpanded ? "Masquer les editions" : `Voir les editions (${group.editions.length})`}
                      <ChevronDown size={14} className={`transition ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  ) : null}
                </div>
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

          {totalPages > 1 ? (
            <nav className="flex flex-wrap items-center justify-center gap-2 pt-2" aria-label="Pagination recherche">
              <button
                type="button"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1 || isSearching}
                className="grid h-10 w-10 place-items-center rounded border border-line bg-ink text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-40"
                aria-label="Page precedente"
              >
                <ChevronLeft size={16} />
              </button>
              {visiblePages.map((page, index) =>
                page === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => changePage(page)}
                    disabled={isSearching}
                    className={`h-10 min-w-10 rounded border px-3 text-sm font-black transition ${
                      currentPage === page
                        ? "border-mint bg-mint text-ink"
                        : "border-line bg-ink text-paper hover:border-mint hover:text-mint"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <form onSubmit={goToTypedPage} className="ml-0 flex items-center gap-2 sm:ml-2">
                <label className="text-xs font-bold text-muted" htmlFor="search-page-input">
                  Page
                </label>
                <input
                  id="search-page-input"
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
                disabled={currentPage === totalPages || isSearching}
                className="grid h-10 w-10 place-items-center rounded border border-line bg-ink text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-40"
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          ) : null}
        </section>
      ) : null}

      {manualOpen ? (
        <form onSubmit={createManual} className="rounded border border-line bg-panel/90 p-5 shadow-poster">
          <h2 className="text-lg font-black text-paper">Ajout manuel</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Pour les livres introuvables ou les metadonnees trop faibles.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Titre"
            />
            <input
              value={manualAuthor}
              onChange={(event) => setManualAuthor(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Auteur(s), separes par virgule"
            />
            <input
              value={manualThumbnailUrl}
              onChange={(event) => setManualThumbnailUrl(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="URL de couverture"
            />
            <input
              value={manualPublishedDate}
              onChange={(event) => setManualPublishedDate(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Publication"
              type="date"
            />
            <input
              value={manualPublisher}
              onChange={(event) => setManualPublisher(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Editeur"
            />
            <input
              value={manualPageCount}
              onChange={(event) => setManualPageCount(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Pages"
              type="number"
              min="1"
            />
            <input
              value={manualLanguage}
              onChange={(event) => setManualLanguage(event.target.value)}
              className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
              placeholder="Langue"
            />
            <textarea
              value={manualDescription}
              onChange={(event) => setManualDescription(event.target.value)}
              className="min-h-24 w-full resize-y rounded border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-mint md:col-span-2"
              placeholder="Description"
            />
          </div>
          <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-white px-4 py-3 text-sm font-black text-ink transition hover:bg-paper md:w-auto">
            <Plus size={16} />
            Creer le livre
          </button>
        </form>
      ) : groups.length ? null : (
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded border border-line bg-ink px-3 text-sm font-black text-paper transition hover:border-mint hover:text-mint"
        >
          <Plus size={16} />
          Livre introuvable ?
        </button>
      )}

      {history.length || recentBooks.length ? (
        <aside className="grid gap-4 lg:grid-cols-2">
          {history.length ? (
            <section className="rounded border border-line bg-panel/75 p-4">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted">
                <Clock size={13} />
                Historique
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setQuery(entry)}
                    className="rounded border border-line bg-ink px-3 py-1.5 text-xs font-bold text-muted transition hover:border-mint hover:text-paper"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {recentBooks.length ? (
            <section className="rounded border border-line bg-panel/75 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted">Derniers livres ajoutes</div>
              <div className="grid grid-cols-5 gap-3">
                {recentBooks.map((book) => (
                  <Link key={book.id} href={`/books/${book.id}`} className="group">
                    <div className="cover-sheen aspect-[2/3] overflow-hidden rounded border border-line bg-panelSoft shadow-poster transition group-hover:border-mint">
                      {book.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-black leading-tight text-paper">{book.title}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
