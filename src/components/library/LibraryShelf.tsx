"use client";

import { ReadingStatus } from "@prisma/client";
import { BookOpen, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type LibraryItem = {
  id: string;
  status: ReadingStatus;
  updatedAt: string;
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    publishedDate: string | null;
    publisher: string | null;
    pageCount: number | null;
    language: string | null;
    source: string;
  };
};

type SortKey = "recent" | "title" | "author" | "publishedDate" | "pageCount" | "status";
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
  title: "Titre",
  author: "Auteur",
  publishedDate: "Publication",
  pageCount: "Pages",
  status: "Statut"
};

export function LibraryShelf({ items }: LibraryShelfProps) {
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const visibleItems = items
    .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
    .sort((a, b) => {
      if (sortKey === "recent") {
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
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded border border-line bg-panel/75 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-muted">Filtrer</div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-10 rounded border border-line bg-ink px-3 text-sm font-bold text-paper outline-none focus:border-mint"
        >
          <option value="ALL">Tous les statuts</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>

        <div className="ml-3 text-xs font-black uppercase tracking-[0.18em] text-muted">Trier</div>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="h-10 rounded border border-line bg-ink px-3 text-sm font-bold text-paper outline-none focus:border-mint"
        >
          {Object.entries(sortLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {visibleItems.map((item) => (
          <Link key={item.id} href={`/books/${item.book.id}`} className="group">
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
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-mint">{statusLabels[item.status]}</div>
              <h3 className="line-clamp-2 text-sm font-black leading-tight text-paper">{item.book.title}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-muted">{item.book.authors.join(", ") || "Auteur inconnu"}</p>
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
            </div>
          </Link>
        ))}
      </div>

      {!visibleItems.length ? (
        <div className="rounded border border-line bg-panel/65 p-8 text-sm text-muted">
          Aucun livre ne correspond a ce filtre.
        </div>
      ) : null}
    </div>
  );
}
