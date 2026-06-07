"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Plus, Search } from "lucide-react";
import { BookCard } from "@/components/books/BookCard";
import { Toast } from "@/components/ui/Toast";

type Candidate = {
  googleBooksVolumeId: string;
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

export function SearchWorkspace() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Candidate[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextStartIndex, setNextStartIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [suggestions, setSuggestions] = useState<Candidate[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualThumbnailUrl, setManualThumbnailUrl] = useState("");
  const [manualPublishedDate, setManualPublishedDate] = useState("");
  const [manualPublisher, setManualPublisher] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");
  const [manualLanguage, setManualLanguage] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);

      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(normalizedQuery)}&startIndex=0`, {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions(payload.items.slice(0, 5));
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
  }, [query]);

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

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSuggesting(false);
    }
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("On cherche dans les livres disponibles...");
    setShowSuggestions(false);

    const formData = new FormData(event.currentTarget);
    const normalizedQuery = String(formData.get("q") ?? searchInputRef.current?.value ?? query).trim();
    setQuery(normalizedQuery);
    rememberSearch(normalizedQuery);

    if (normalizedQuery.length < 2) {
      setItems([]);
      setStatus("Entre au moins 2 caracteres pour lancer la recherche.");
      return;
    }

    const response = await fetch(`/api/books/search?q=${encodeURIComponent(normalizedQuery)}&startIndex=0`);
    const payload = await response.json();

    if (!response.ok) {
      setStatus("La recherche ne repond pas pour le moment. Reessaie dans quelques instants.");
      return;
    }

    setLastQuery(normalizedQuery);
    setItems(payload.items);
    setHasMore(payload.hasMore);
    setNextStartIndex(payload.nextStartIndex);
    setStatus(payload.items.length ? "" : "Aucun livre trouve pour cette recherche. Tu peux l'ajouter manuellement.");
  }

  function selectSuggestion(book: Candidate) {
    setQuery(book.title);
    setLastQuery(book.title);
    setItems([book]);
    setHasMore(false);
    setNextStartIndex(0);
    setStatus("");
    setSuggestions([]);
    setShowSuggestions(false);
    rememberSearch(book.title);
  }

  function clearSearchSuggestions() {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSuggesting(false);
  }

  async function loadMore() {
    if (!lastQuery || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setStatus("");

    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(lastQuery)}&startIndex=${nextStartIndex}`);
      const payload = await response.json();

      if (!response.ok) {
        setStatus("On n'a pas pu afficher plus de resultats. Reessaie dans un instant.");
        return;
      }

      setItems((current) => [...current, ...payload.items]);
      setHasMore(payload.hasMore);
      setNextStartIndex(payload.nextStartIndex);
    } finally {
      setLoadingMore(false);
    }
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
    setOpeningId(book.googleBooksVolumeId);
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
    setSavingId(book.googleBooksVolumeId);
    setStatus("Ajout du livre a ta bibliotheque...");
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
      setSavedIds((current) => new Set(current).add(book.googleBooksVolumeId));
      setStatus("");
      clearSearchSuggestions();
      setToast({ tone: "success", message: `"${payload.title}" est dans ta bibliotheque.` });
    } catch (error) {
      setStatus("");
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
    setStatus("Creation du livre...");
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
      setStatus("");
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
      setStatus("");
      setToast({ tone: "success", message: `"${payload.title}" est cree et ajoute a ta bibliotheque.` });
    } catch (error) {
      setStatus("");
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Le livre est cree, mais il n'a pas pu etre ajoute a ta bibliotheque."
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <form onSubmit={search} className="rounded border border-line bg-panel/75 p-4 shadow-poster">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                name="q"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onInput={(event) => updateQuery(event.currentTarget.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                className="h-12 w-full rounded border border-line bg-ink px-4 text-white outline-none transition placeholder:text-muted/45 focus:border-mint"
                placeholder="Titre, auteur, ISBN..."
              />
              {showSuggestions ? (
                <div className="absolute left-0 right-0 top-14 z-20 max-h-80 overflow-y-auto rounded border border-line bg-ink shadow-2xl shadow-black/40">
                  {suggestions.map((book) => (
                    <button
                      key={book.googleBooksVolumeId}
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
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center gap-2 rounded bg-mint px-5 font-black text-ink transition hover:bg-lime"
            >
              <Search size={18} />
              {isSuggesting ? "Propositions..." : "Rechercher"}
            </button>
          </div>
        </form>

        {status ? <p className="mt-4 rounded border border-line bg-panelSoft px-4 py-3 text-sm text-muted">{status}</p> : null}
        {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {items.map((book) => {
            const isSaved = savedIds.has(book.googleBooksVolumeId);
            const isSaving = savingId === book.googleBooksVolumeId;

            return (
              <div key={book.googleBooksVolumeId} className="relative">
                <button
                  type="button"
                  onClick={() => openBookPage(book)}
                  disabled={openingId === book.googleBooksVolumeId}
                  className="block w-full text-left disabled:cursor-wait disabled:opacity-70"
                >
                  <BookCard book={book} variant="poster" />
                </button>
                <button
                  onClick={() => persistBook(book)}
                  disabled={isSaving || isSaved}
                  className="absolute right-2 top-2 inline-flex items-center gap-2 rounded bg-mint px-3 py-2 text-xs font-black text-ink shadow-poster transition hover:bg-lime disabled:cursor-default disabled:bg-panelSoft disabled:text-muted"
                >
                  <Plus size={14} />
                  {isSaved ? "Ajoute" : isSaving ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            );
          })}
        </div>
        {items.length > 0 && hasMore ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex h-12 items-center justify-center rounded border border-line bg-panel px-5 text-sm font-black text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-60"
            >
              {loadingMore ? "Chargement..." : "Afficher plus"}
            </button>
          </div>
        ) : null}

        {history.length ? (
          <div className="mt-6 rounded border border-line bg-panel/75 p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted">
              <Clock size={13} />
              Historique de recherche
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
          </div>
        ) : null}

        {recentBooks.length ? (
          <div className="mt-4 rounded border border-line bg-panel/75 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted">5 derniers livres ajoutes</div>
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
          </div>
        ) : null}
      </div>

      <form onSubmit={createManual} className="h-fit rounded border border-line bg-panel/90 p-5 shadow-poster">
        <h2 className="text-lg font-black text-paper">Ajout manuel</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Pour les livres introuvables ou les metadonnees trop faibles.</p>
        <input
          value={manualTitle}
          onChange={(event) => setManualTitle(event.target.value)}
          className="mt-5 h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
          placeholder="Titre"
        />
        <input
          value={manualAuthor}
          onChange={(event) => setManualAuthor(event.target.value)}
          className="mt-3 h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
          placeholder="Auteur(s), separes par virgule"
        />
        <input
          value={manualThumbnailUrl}
          onChange={(event) => setManualThumbnailUrl(event.target.value)}
          className="mt-3 h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
          placeholder="URL de couverture"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            value={manualPublishedDate}
            onChange={(event) => setManualPublishedDate(event.target.value)}
            className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
            placeholder="Publication"
            type="date"
          />
          <input
            value={manualPageCount}
            onChange={(event) => setManualPageCount(event.target.value)}
            className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
            placeholder="Pages"
            type="number"
            min="1"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            value={manualPublisher}
            onChange={(event) => setManualPublisher(event.target.value)}
            className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
            placeholder="Editeur"
          />
          <input
            value={manualLanguage}
            onChange={(event) => setManualLanguage(event.target.value)}
            className="h-11 w-full rounded border border-line bg-ink px-3 text-sm outline-none focus:border-mint"
            placeholder="Langue"
          />
        </div>
        <textarea
          value={manualDescription}
          onChange={(event) => setManualDescription(event.target.value)}
          className="mt-3 min-h-28 w-full resize-y rounded border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-mint"
          placeholder="Description"
        />
        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-white px-4 py-3 text-sm font-black text-ink transition hover:bg-paper">
          <Plus size={16} />
          Creer le livre
        </button>
      </form>
    </div>
  );
}
