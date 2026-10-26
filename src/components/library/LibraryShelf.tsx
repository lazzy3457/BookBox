"use client";

import { ReadingStatus } from "@prisma/client";
import { BookOpen, Calendar, CalendarPlus, FileText, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { GenreBadges } from "@/components/books/GenreBadges";
import { GENRES, genreLabel } from "@/lib/genres";

type LibraryItem = {
  id: string;
  status: ReadingStatus;
  addedAt: string;
  updatedAt: string;
  latestReading: {
    startedAt: string | null;
    finishedAt: string | null;
    isReread: boolean;
    page: number | null;
    percentage: number | null;
    chapter: string | null;
  } | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    publishedDate: string | null;
    publisher: string | null;
    pageCount: number | null;
    language: string | null;
    genres: string[];
    source: string;
  };
};

type SortKey = "recent" | "activity" | "title" | "author" | "publishedDate" | "pageCount" | "status";
type StatusFilter = "ALL" | ReadingStatus;

type LibraryShelfProps = {
  items: LibraryItem[];
};

const statusLabels: Record<ReadingStatus, string> = {
  TO_READ: "A lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonne"
};

const sortLabels: Record<SortKey, string> = {
  recent: "Ajout recent",
  activity: "Activite recente",
  title: "Titre",
  author: "Auteur",
  publishedDate: "Publication",
  pageCount: "Pages",
  status: "Statut"
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function LibraryShelf({ items }: LibraryShelfProps) {
  const [libraryItems, setLibraryItems] = useState(items);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [genreFilter, setGenreFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function removeFromLibrary(bookId: string, title: string) {
    setToast(null);
    const response = await fetch(`/api/library?bookId=${encodeURIComponent(bookId)}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setLibraryItems((current) => current.filter((item) => item.book.id !== bookId));
      setToast({ tone: "success", message: `"${title}" a ete retire de ta bibliotheque.` });
      return;
    }

    setToast({ tone: "error", message: "Ce livre n'a pas pu etre retire de ta bibliotheque." });
  }

  const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
  const libraryGenres = GENRES.filter((genre) => libraryItems.some((item) => item.book.genres.includes(genre.slug)));

  const visibleItems = libraryItems
    .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
    .filter((item) => genreFilter === "ALL" || item.book.genres.includes(genreFilter))
    .filter((item) => {
      if (!searchTerms.length) return true;
      const haystack = normalize([item.book.title, ...item.book.authors, item.book.publisher ?? "", ...item.book.genres.map(genreLabel)].join(" "));
      return searchTerms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      if (sortKey === "recent") {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }

      if (sortKey === "activity") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      if (sortKey === "title") {
        return a.book.title.localeCompare(b.book.title);
      }

      if (sortKey === "author") {
        return (a.book.authors[0] ?? "").localeCompare(b.book.authors[0] ?? "");
      }

      if (sortKey === "publishedDate") {
        return (b.book.publishedDate ?? "").localeCompare(a.book.publishedDate ?? "");
      }

      if (sortKey === "pageCount") {
        return (b.book.pageCount ?? 0) - (a.book.pageCount ?? 0);
      }

      return statusLabels[a.status].localeCompare(statusLabels[b.status]);
    });

  return (
    <div>
      <div className="mb-5 grid gap-3 rounded border border-line bg-panel/75 p-4 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Rechercher dans ma bibliotheque</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titre, auteur, genre..."
            className="h-10 w-full rounded border border-line bg-ink pl-9 pr-9 text-sm font-bold text-paper outline-none placeholder:font-normal placeholder:text-muted focus:border-mint [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-paper"
              title="Effacer la recherche"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <div className="text-xs font-black uppercase tracking-[0.18em] text-muted sm:ml-3">Filtrer</div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-10 w-full rounded border border-line bg-ink px-3 text-sm font-bold text-paper outline-none focus:border-mint sm:w-auto"
        >
          <option value="ALL">Tous les statuts</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        {libraryGenres.length ? (
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className="h-10 w-full rounded border border-line bg-ink px-3 text-sm font-bold text-paper outline-none focus:border-mint sm:w-auto"
            aria-label="Filtrer par genre"
          >
            <option value="ALL">Tous les genres</option>
            {libraryGenres.map((genre) => (
              <option key={genre.slug} value={genre.slug}>
                {genre.label}
              </option>
            ))}
          </select>
        ) : null}

        <div className="text-xs font-black uppercase tracking-[0.18em] text-muted sm:ml-3">Trier</div>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="h-10 w-full rounded border border-line bg-ink px-3 text-sm font-bold text-paper outline-none focus:border-mint sm:w-auto"
        >
          {Object.entries(sortLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6 2xl:grid-cols-8">
        {visibleItems.map((item) => (
          <div key={item.id} className="group relative">
            <Link href={`/books/${item.book.id}`}>
              <div className="cover-sheen aspect-[2/3] overflow-hidden rounded border border-line bg-panel shadow-poster transition group-hover:-translate-y-1 group-hover:border-mint/70">
                {item.book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <BookOpen className="text-muted" />
                  </div>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => removeFromLibrary(item.book.id, item.book.title)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded bg-ink/85 text-muted shadow-poster transition hover:bg-coral hover:text-paper"
              title="Retirer de ma bibliotheque"
            >
              <Trash2 size={14} />
            </button>
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-mint">{statusLabels[item.status]}</div>
              <Link href={`/books/${item.book.id}`}>
                <h3 className="line-clamp-2 text-sm font-black leading-tight text-paper">{item.book.title}</h3>
              </Link>
              <p className="mt-1 line-clamp-1 text-xs text-muted">{item.book.authors.join(", ") || "Auteur inconnu"}</p>
              <GenreBadges genres={item.book.genres} limit={2} size="sm" className="mt-2" />
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
                {item.book.publishedDate ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {item.book.publishedDate}
                  </span>
                ) : null}
                {item.book.pageCount ? (
                  <span className="inline-flex items-center gap-1">
                    <FileText size={12} />
                    {item.book.pageCount} p.
                  </span>
                ) : null}
              </div>
              {item.book.publisher ? <p className="mt-1 line-clamp-1 text-[11px] text-muted/75">{item.book.publisher}</p> : null}
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted/75" title="Date d'ajout a ta bibliotheque">
                <CalendarPlus size={12} />
                Ajouté le {new Date(item.addedAt).toLocaleDateString("fr-FR")}
              </p>
              {item.latestReading ? (
                <div className="mt-2 rounded border border-line bg-ink/45 p-2 text-[11px] text-muted">
                  <div className="font-black text-mint">{item.latestReading.isReread ? "Relecture" : "Journal"}</div>
                  <div className="mt-1">
                    {[
                      item.latestReading.page ? `p. ${item.latestReading.page}` : null,
                      item.latestReading.percentage != null ? `${item.latestReading.percentage}%` : null,
                      item.latestReading.chapter
                    ].filter(Boolean).join(" · ") || (
                      item.latestReading.finishedAt
                        ? `Terminé le ${new Date(item.latestReading.finishedAt).toLocaleDateString("fr-FR")}`
                        : item.latestReading.startedAt
                          ? `Commencé le ${new Date(item.latestReading.startedAt).toLocaleDateString("fr-FR")}`
                          : "Lecture enregistrée"
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {!visibleItems.length ? (
        <div className="rounded border border-line bg-panel/65 p-8 text-sm text-muted">
          {searchTerms.length ? `Aucun livre ne correspond a "${query.trim()}".` : "Aucun livre ne correspond a ce filtre."}
        </div>
      ) : null}
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
