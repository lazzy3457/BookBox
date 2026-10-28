"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, CornerDownLeft, Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { BookCover } from "@/components/books/BookCover";
import { GENRES, genreLabel } from "@/lib/genres";

type Status = "TO_READ" | "READING" | "READ";

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
  genres?: string[];
};

type LocalBook = {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  publishedDate: string | null;
  genres: string[];
  readers: number;
};

type LocalAuthor = { name: string; bookCount: number; href: string };

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

type DropdownOption =
  | { kind: "local"; book: LocalBook }
  | { kind: "author"; author: LocalAuthor }
  | { kind: "external"; book: Candidate };

const PAGE_SIZE = 20;
const statusLabels: Record<Status, string> = { TO_READ: "À lire", READING: "En cours", READ: "Lu" };
const exploreGenres = ["fantasy", "science-fiction", "romance", "thriller", "policier", "classique", "bd-manga", "poesie", "biographie", "jeunesse"];
const languageLabels: Record<string, string> = { fr: "Français", en: "Anglais", es: "Espagnol", it: "Italien", de: "Allemand" };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isLikelyIsbn(value: string) {
  const normalized = value.replace(/[^0-9X]/gi, "");
  return normalized.length === 10 || normalized.length === 13;
}

function bookKey(book: Candidate) {
  return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? `${book.title}-${book.authors.join(",")}`;
}

function year(value?: string | null) {
  return value?.slice(0, 4) ?? null;
}

function firstIsbn(book: Candidate) {
  return [...(book.isbn13 ?? []), ...(book.isbn10 ?? [])][0] ?? null;
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
  const score = (book: Candidate) => (book.thumbnailUrl ? 2 : 0) + (firstIsbn(book) ? 1 : 0) + (book.publisher ? 1 : 0);
  return score(next) > score(current) ? next : current;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée) : l'historique reste en mémoire.
  }
}

type SearchWorkspaceProps = {
  initialQuery?: string;
  isSignedIn: boolean;
};

export function SearchWorkspace({ initialQuery = "", isSignedIn }: SearchWorkspaceProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [lastQuery, setLastQuery] = useState("");
  const [items, setItems] = useState<Candidate[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [nextStart, setNextStart] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [localBooks, setLocalBooks] = useState<LocalBook[]>([]);
  const [localAuthor, setLocalAuthor] = useState<LocalAuthor | null>(null);
  const [suggestions, setSuggestions] = useState<Candidate[]>([]);
  const [suggestTotal, setSuggestTotal] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedEditionKey, setSelectedEditionKey] = useState<string | null>(null);
  const [panelStatus, setPanelStatus] = useState<Status>("TO_READ");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Map<string, Status>>(new Map());
  const [history, setHistory] = useState<string[]>([]);
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  // Le stockage local n'existe qu'au navigateur : lecture après hydratation pour éviter un écart serveur/client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(readStorage<string[]>("booksbox.searchHistory", []));
    setRecentBooks(readStorage<RecentBook[]>("booksbox.recentBooks", []));
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, ResultGroup>();
    items.forEach((book) => {
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
  }, [items]);

  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? null;
  const selectedEdition = selectedGroup?.editions.find((edition) => bookKey(edition) === selectedEditionKey) ?? selectedGroup?.main ?? null;

  const options: DropdownOption[] = useMemo(() => [
    ...localBooks.map((book) => ({ kind: "local" as const, book })),
    ...(localAuthor ? [{ kind: "author" as const, author: localAuthor }] : []),
    ...suggestions.slice(0, localBooks.length ? 2 : 5).map((book) => ({ kind: "external" as const, book }))
  ], [localAuthor, localBooks, suggestions]);

  const searchUrl = useCallback((searchQuery: string, startIndex: number, pageSize = PAGE_SIZE) => {
    const params = new URLSearchParams({
      q: searchQuery,
      startIndex: String(startIndex),
      pageSize: String(pageSize),
      mode: isLikelyIsbn(searchQuery) ? "isbn" : "all",
      language: "all",
      source: "all"
    });
    return `/api/books/search?${params.toString()}`;
  }, []);

  // Recherche instantanée : livres BooksBox d'abord, puis éditions externes.
  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2 || normalized === lastQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const [localResponse, externalResponse] = await Promise.all([
          fetch(`/api/books/local?q=${encodeURIComponent(normalized)}`, { signal: controller.signal }),
          fetch(searchUrl(normalized, 0, 8), { signal: controller.signal })
        ]);
        const localPayload = localResponse.ok ? await localResponse.json() : { items: [], author: null };
        const externalPayload = externalResponse.ok ? await externalResponse.json() : { items: [], totalItems: 0 };
        setLocalBooks(localPayload.items ?? []);
        setLocalAuthor(localPayload.author ?? null);
        setSuggestions(externalPayload.items ?? []);
        setSuggestTotal(externalPayload.totalItems ?? 0);
        setActiveIndex(-1);
        setDropdownOpen(document.activeElement === inputRef.current);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSuggesting(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [lastQuery, query, searchUrl]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function rememberSearch(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
    setHistory(next);
    writeStorage("booksbox.searchHistory", next);
  }

  function rememberBook(book: RecentBook) {
    const next = [book, ...recentBooks.filter((item) => item.id !== book.id)].slice(0, 6);
    setRecentBooks(next);
    writeStorage("booksbox.recentBooks", next);
  }

  async function runSearch(searchQuery: string) {
    const normalized = searchQuery.trim();
    if (normalized.length < 2) {
      setStatus("Entre au moins 2 caractères pour lancer la recherche.");
      return;
    }
    setQuery(normalized);
    setDropdownOpen(false);
    setIsSearching(true);
    setStatus("");
    setToast(null);
    try {
      const response = await fetch(searchUrl(normalized, 0));
      const payload = await response.json();
      if (!response.ok) {
        setStatus("La recherche ne répond pas pour le moment. Réessaie dans quelques instants.");
        return;
      }
      setLastQuery(normalized);
      setItems(payload.items ?? []);
      setTotalItems(payload.totalItems ?? 0);
      setNextStart(payload.nextStartIndex ?? PAGE_SIZE);
      setHasMore(Boolean(payload.hasMore));
      setSelectedGroupKey(null);
      setSelectedEditionKey(null);
      rememberSearch(normalized);
      setStatus((payload.items ?? []).length ? "" : "Aucun livre trouvé. Essaie un ISBN, un autre titre, ou ajoute-le à la main.");
      router.replace(`/search?q=${encodeURIComponent(normalized)}`, { scroll: false });
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    // La recherche initiale (lien ?q=) ne doit partir qu'une fois.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialQuery.trim().length >= 2) void runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const response = await fetch(searchUrl(lastQuery, nextStart));
      const payload = await response.json();
      if (response.ok) {
        setItems((current) => [...current, ...(payload.items ?? [])]);
        setNextStart(payload.nextStartIndex ?? nextStart + PAGE_SIZE);
        setHasMore(Boolean(payload.hasMore));
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  function requireAccount() {
    if (isSignedIn) return true;
    router.push(`/login?callbackUrl=${encodeURIComponent(`/search?q=${lastQuery || query}`)}`);
    return false;
  }

  async function saveBook(book: Candidate) {
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book)
    });
    if (!response.ok) throw new Error("Ce livre n'a pas pu être enregistré. Réessaie.");
    return response.json() as Promise<RecentBook>;
  }

  async function setLibraryStatus(bookId: string, nextStatus: Status) {
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, status: nextStatus })
    });
    if (!response.ok) throw new Error("Ce livre n'a pas pu être ajouté à ta bibliothèque.");
  }

  async function addWithStatus(book: Candidate, nextStatus: Status, trackKey = bookKey(book)) {
    if (!requireAccount()) return;
    setBusyKey(trackKey);
    setToast(null);
    try {
      const saved = await saveBook(book);
      await setLibraryStatus(saved.id, nextStatus);
      rememberBook({ id: saved.id, title: saved.title, authors: saved.authors, thumbnailUrl: saved.thumbnailUrl });
      setSavedKeys((current) => new Map(current).set(trackKey, nextStatus));
      setToast({ tone: "success", message: `« ${saved.title} » est rangé dans « ${statusLabels[nextStatus]} ».` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur inattendue." });
    } finally {
      setBusyKey(null);
    }
  }

  async function openExternal(book: Candidate) {
    if (!requireAccount()) return;
    setBusyKey(`open-${bookKey(book)}`);
    try {
      const saved = await saveBook(book);
      rememberBook({ id: saved.id, title: saved.title, authors: saved.authors, thumbnailUrl: saved.thumbnailUrl });
      router.push(`/books/${saved.id}`);
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur inattendue." });
      setBusyKey(null);
    }
  }

  function openLocal(book: LocalBook) {
    rememberBook({ id: book.id, title: book.title, authors: book.authors, thumbnailUrl: book.thumbnailUrl });
    router.push(`/books/${book.id}`);
  }

  function chooseOption(option: DropdownOption) {
    setDropdownOpen(false);
    if (option.kind === "local") openLocal(option.book);
    else if (option.kind === "author") router.push(option.author.href);
    else void openExternal(option.book);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDropdownOpen(false);
      return;
    }
    if (!dropdownOpen || !options.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function selectGroup(group: ResultGroup) {
    setSelectedGroupKey(group.key);
    setSelectedEditionKey(bookKey(group.main));
    setPanelStatus(savedKeys.get(group.key) ?? "TO_READ");
  }

  async function createManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireAccount()) return;
    setToast(null);
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: manualTitle,
        authors: manualAuthor.split(",").map((author) => author.trim()).filter(Boolean),
        genres: []
      })
    });
    if (!response.ok) {
      setToast({ tone: "error", message: "Le livre n'a pas pu être créé. Vérifie le titre et l'auteur." });
      return;
    }
    const payload = (await response.json()) as RecentBook;
    try {
      await setLibraryStatus(payload.id, "TO_READ");
      rememberBook(payload);
      setManualTitle("");
      setManualAuthor("");
      setToast({ tone: "success", message: `« ${payload.title} » est créé et rangé dans « À lire ». Complète sa fiche quand tu veux.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur inattendue." });
    }
  }

  const hasResults = Boolean(lastQuery);
  const step = selectedGroup ? 2 : 1;

  const searchBox = (
    <div ref={boxRef} className={`relative w-full ${hasResults ? "" : "max-w-[880px]"}`}>
      <form
        onSubmit={submit}
        role="search"
        className={`flex items-center gap-3 rounded-full border bg-panel py-1.5 pl-5 pr-1.5 shadow-poster transition ${
          dropdownOpen ? "border-mint ring-1 ring-mint" : "border-line"
        }`}
      >
        <Search size={18} aria-hidden className="shrink-0 text-mint" />
        <label htmlFor="book-search" className="sr-only">Titre, auteur ou ISBN</label>
        <input
          ref={inputRef}
          id="book-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.trim().length >= 2 && query.trim() !== lastQuery && setDropdownOpen(true)}
          onKeyDown={(event) => {
            onKeyDown(event);
            if (event.key === "Enter" && dropdownOpen && options[activeIndex] && activeIndex >= 0) {
              event.preventDefault();
              chooseOption(options[activeIndex]);
            }
          }}
          placeholder="Titre, auteur ou ISBN"
          autoComplete="off"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="search-suggestions"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-paper outline-none placeholder:text-muted/80"
        />
        {isSuggesting ? <Loader2 size={16} aria-hidden className="animate-spin text-muted" /> : null}
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDropdownOpen(false);
              inputRef.current?.focus();
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-ink text-muted hover:text-paper"
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        ) : null}
        <button type="submit" disabled={isSearching} className="bb-btn-primary px-5 py-2.5 text-sm">
          {isSearching ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {dropdownOpen && (options.length || isSuggesting) ? (
        <div id="search-suggestions" role="listbox" className="bb-card absolute inset-x-0 top-full z-20 mt-2.5 overflow-hidden p-2.5">
          {localBooks.length ? <p className="bb-label px-2 pb-1 pt-2 text-muted">Dans BooksBox</p> : null}
          {options.map((option, index) => {
            const active = index === activeIndex;
            const showExternalHeader = option.kind === "external" && options[index - 1]?.kind !== "external";
            const showAuthorHeader = option.kind === "author";
            return (
              <div key={option.kind === "local" ? option.book.id : option.kind === "author" ? option.author.name : bookKey(option.book)}>
                {showAuthorHeader ? <p className="bb-label px-2 pb-1 pt-3 text-muted">Auteur</p> : null}
                {showExternalHeader ? <p className="bb-label px-2 pb-1 pt-3 text-muted">Autres éditions · Google Books, Open Library</p> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseOption(option)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${active ? "bg-mint/[0.06]" : ""}`}
                >
                  {option.kind === "author" ? (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-muted"><UserRound size={16} /></span>
                  ) : (
                    <BookCover title={option.book.title} thumbnailUrl={option.book.thumbnailUrl} className="h-9 w-6 rounded-md" iconSize={0} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-semibold text-paper">
                      {option.kind === "author" ? option.author.name : option.book.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {option.kind === "local"
                        ? [option.book.authors[0], year(option.book.publishedDate), `${option.book.readers} lecteur${option.book.readers > 1 ? "s" : ""} sur BooksBox`].filter(Boolean).join(" · ")
                        : option.kind === "author"
                          ? `${option.author.bookCount} livre${option.author.bookCount > 1 ? "s" : ""} sur BooksBox · voir la page auteur`
                          : [option.book.publisher ?? option.book.authors[0], year(option.book.publishedDate), "à importer"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {active ? (
                    <span className="hidden items-center gap-1 text-xs font-bold text-mint sm:inline-flex">
                      {option.kind === "author" ? "Voir l'auteur" : "Ouvrir la fiche"}
                      <CornerDownLeft size={12} aria-hidden />
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
          <div className="-mx-2.5 -mb-2.5 mt-2 flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-3">
            <button type="button" onClick={() => void runSearch(query)} className="inline-flex items-center gap-2 text-[13px] font-extrabold text-mint">
              Voir {suggestTotal ? `les ${suggestTotal} livres` : "tous les livres"} pour « {query.trim()} »
              <ArrowRight size={14} aria-hidden />
            </button>
            <span className="hidden items-center gap-2 text-xs text-muted md:flex">
              <kbd className="rounded-full border border-line bg-panel px-2 py-0.5 font-bold text-paper">↑↓</kbd> naviguer
              <kbd className="rounded-full border border-line bg-panel px-2 py-0.5 font-bold text-paper">Entrée</kbd> ouvrir
              <kbd className="rounded-full border border-line bg-panel px-2 py-0.5 font-bold text-paper">Échap</kbd> fermer
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-w-0">
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      {!hasResults ? (
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-8 pb-10 pt-6">
          <div className="text-center">
            <h1 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-[44px]">Trouve ton prochain livre</h1>
            <p className="mt-3 text-sm text-muted">Titre, auteur ou ISBN. Les livres déjà sur BooksBox apparaissent en premier.</p>
          </div>
          {searchBox}
          {status ? <p className="w-full text-sm font-bold text-coral">{status}</p> : null}

          <div className="flex w-full flex-col gap-7">
            {history.length ? (
              <section className="flex flex-col gap-3">
                <h2 className="bb-h3">Tes recherches récentes</h2>
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 6).map((item) => (
                    <button key={item} type="button" onClick={() => void runSearch(item)} className="bb-chip">{item}</button>
                  ))}
                </div>
              </section>
            ) : null}

            {recentBooks.length ? (
              <section className="flex flex-col gap-3">
                <h2 className="bb-h3">Consultés récemment</h2>
                <div className="flex flex-wrap gap-3">
                  {recentBooks.map((book) => (
                    <Link key={book.id} href={`/books/${book.id}`} title={book.title} className="transition hover:-translate-y-1">
                      <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[104px] w-[70px]" iconSize={0} />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="flex flex-col gap-3">
              <h2 className="bb-h3">Explorer par genre</h2>
              <div className="flex flex-wrap gap-2">
                {exploreGenres.map((slug) => (
                  <button key={slug} type="button" onClick={() => void runSearch(`subject:${genreLabel(slug)}`)} className="bb-chip">
                    {GENRES.find((genre) => genre.slug === slug)?.label ?? slug}
                  </button>
                ))}
              </div>
            </section>

            <p className="text-xs text-muted">
              Tu ne trouves pas un livre ?{" "}
              <button type="button" onClick={() => { setLastQuery(" "); }} className="font-extrabold text-mint hover:underline">
                Ajoute-le à la main
              </button>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {searchBox}

          <ol className="flex flex-wrap items-center gap-3 text-[13px] font-bold">
            {["Trouve le livre", "Choisis l'édition", "Ajoute-le avec un statut"].map((label, index) => {
              const done = index + 1 <= step;
              return (
                <li key={label} className="flex items-center gap-3">
                  {index ? <span aria-hidden className="h-px w-8 bg-line" /> : null}
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${done ? "bg-mint text-ink" : "border border-line bg-panel text-muted"}`}>{index + 1}</span>
                  <span className={done ? "text-paper" : "text-muted"}>{label}</span>
                </li>
              );
            })}
          </ol>

          <div className={`grid min-w-0 gap-6 ${selectedGroup ? "lg:grid-cols-[minmax(0,1fr)_450px]" : ""}`}>
            <div className="flex min-w-0 flex-col gap-3">
              {lastQuery.trim() ? (
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h1 className="bb-h3">{groups.length} livre{groups.length > 1 ? "s" : ""} trouvé{groups.length > 1 ? "s" : ""}</h1>
                  <span className="text-xs text-muted">pour « {lastQuery} » · {Math.max(totalItems, items.length)} éditions regroupées</span>
                </div>
              ) : null}
              {status ? <p className="text-sm font-bold text-coral">{status}</p> : null}

              {groups.map((group) => {
                const isSelected = group.key === selectedGroupKey;
                const saved = savedKeys.get(group.key);
                const genre = group.main.genres?.[0];
                return (
                  <article key={group.key} className={`bb-card-flat flex flex-col gap-4 p-3 sm:flex-row sm:items-center ${isSelected ? "border-mint ring-1 ring-mint" : ""}`}>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <BookCover title={group.main.title} thumbnailUrl={group.main.thumbnailUrl} className="h-[96px] w-16" iconSize={0} />
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => void openExternal(group.main)} className="block max-w-full truncate text-left font-display text-lg font-semibold text-paper hover:text-mint">
                          {group.main.title}
                        </button>
                        <p className="truncate text-sm text-muted">
                          {[group.main.authors.join(", ") || "Auteur inconnu", year(group.main.publishedDate), genre ? genreLabel(genre) : null].filter(Boolean).join(" · ")}
                        </p>
                        <button type="button" onClick={() => selectGroup(group)} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-mint hover:underline">
                          {group.editions.length} édition{group.editions.length > 1 ? "s" : ""} disponible{group.editions.length > 1 ? "s" : ""}
                          <ChevronRight size={14} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 rounded-full bg-ink p-1" role="group" aria-label={`Ranger ${group.main.title}`}>
                      {(Object.keys(statusLabels) as Status[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={busyKey === group.key}
                          onClick={() => void addWithStatus(group.main, value, group.key)}
                          aria-pressed={saved === value}
                          className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${saved === value ? "bg-mint text-ink" : "text-paper hover:bg-panel"}`}
                        >
                          {statusLabels[value]}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}

              {hasMore ? (
                <button type="button" onClick={() => void loadMore()} disabled={isLoadingMore} className="bb-btn-outline w-fit px-5 py-2.5 text-sm text-mint">
                  {isLoadingMore ? "Chargement…" : "Voir plus de livres"}
                </button>
              ) : null}

              <form onSubmit={createManual} className="mt-2 flex flex-col gap-3 rounded bg-panelSoft/70 p-5">
                <h2 className="bb-h3">Ton livre n&apos;est pas dans la liste ?</h2>
                <p className="text-[13px] text-muted">Ajoute-le avec juste le titre et l&apos;auteur, tu compléteras le reste plus tard.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="manual-title">Titre</label>
                  <input id="manual-title" required value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Titre" className="bb-input rounded-full" />
                  <label className="sr-only" htmlFor="manual-author">Auteur</label>
                  <input id="manual-author" value={manualAuthor} onChange={(event) => setManualAuthor(event.target.value)} placeholder="Auteur" className="bb-input rounded-full" />
                  <button type="submit" className="bb-btn-primary">Ajouter</button>
                </div>
              </form>
            </div>

            {selectedGroup && selectedEdition ? (
              <aside className="bb-card flex h-fit flex-col gap-5 p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain" aria-label="Choisir l'édition">
                <div className="flex gap-4">
                  <BookCover title={selectedGroup.main.title} thumbnailUrl={selectedEdition.thumbnailUrl} className="h-[130px] w-[88px]" iconSize={0} />
                  <div className="min-w-0 flex-1">
                    <p className="bb-label text-coral">Étape 2 sur 3</p>
                    <h2 className="font-display text-2xl font-semibold text-paper">{selectedGroup.main.title}</h2>
                    <p className="text-sm text-muted">{[selectedGroup.main.authors[0], year(selectedGroup.main.publishedDate)].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedGroupKey(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-muted hover:text-paper" aria-label="Fermer">
                    <X size={15} />
                  </button>
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="bb-h3 mb-3">Choisis ton édition</legend>
                  {selectedGroup.editions.map((edition) => {
                    const key = bookKey(edition);
                    const checked = key === bookKey(selectedEdition);
                    const isbn = firstIsbn(edition);
                    return (
                      <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${checked ? "border-mint bg-panel ring-1 ring-mint" : "border-line bg-ink"}`}>
                        <BookCover title={edition.title} thumbnailUrl={edition.thumbnailUrl} className="h-12 w-8 rounded-md" iconSize={0} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-paper">{[edition.publisher ?? "Éditeur inconnu", year(edition.publishedDate)].filter(Boolean).join(" · ")}</span>
                          <span className="block truncate text-xs text-muted">
                            {[edition.pageCount ? `${edition.pageCount} pages` : null, edition.language ? languageLabels[edition.language] ?? edition.language.toUpperCase() : null, isbn ? `ISBN ${isbn}` : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <input type="radio" name="edition" checked={checked} onChange={() => setSelectedEditionKey(key)} className="h-4 w-4 accent-[rgb(var(--c-mint))]" />
                      </label>
                    );
                  })}
                </fieldset>

                <div className="flex flex-col gap-3">
                  <h3 className="bb-h3">Où le ranger ?</h3>
                  <div className="grid grid-cols-3 rounded-full bg-ink p-1" role="radiogroup" aria-label="Statut">
                    {(Object.keys(statusLabels) as Status[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={panelStatus === value}
                        onClick={() => setPanelStatus(value)}
                        className={`rounded-full py-2 text-sm font-bold transition ${panelStatus === value ? "bg-mint text-ink" : "text-paper"}`}
                      >
                        {statusLabels[value]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busyKey === selectedGroup.key}
                    onClick={() => void addWithStatus(selectedEdition, panelStatus, selectedGroup.key)}
                    className="bb-btn-primary w-full py-3 text-sm"
                  >
                    <Plus size={16} aria-hidden />
                    Ajouter à ma bibliothèque
                  </button>
                  <button type="button" onClick={() => void openExternal(selectedEdition)} className="bb-btn-soft w-full py-3 text-sm">
                    Ouvrir la fiche du livre
                  </button>
                </div>
                <p className="text-xs text-muted">Tu pourras changer d&apos;édition plus tard depuis la fiche.</p>
              </aside>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
