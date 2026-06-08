"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCard } from "@/components/books/BookCard";

type AuthorBook = {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
  publishedDate?: string | null;
  averageRating?: number | null;
};

type AuthorBookshelfProps = {
  books: AuthorBook[];
};

const PAGE_SIZE = 10;

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

export function AuthorBookshelf({ books }: AuthorBookshelfProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const visiblePages = paginationItems(currentPage, totalPages);
  const pageBooks = useMemo(() => books.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [books, currentPage]);

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

  if (!books.length) {
    return (
      <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
        Aucun livre de cet auteur n'est encore dans BooksBox.
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="scroll-mt-24">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
        {pageBooks.map((book) => (
          <BookCard key={book.id} book={book} href={`/books/${book.id}`} variant="poster" showScore={false} />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination livres BooksBox">
          <button
            type="button"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="grid h-10 w-10 place-items-center rounded border border-line bg-ink text-paper transition hover:border-mint hover:text-mint disabled:cursor-default disabled:opacity-40"
            aria-label="Page precedente"
          >
            <ChevronLeft size={16} />
          </button>
          {visiblePages.map((page, index) =>
            page === "ellipsis" ? (
              <span key={`booksbox-ellipsis-${index}`} className="px-2 text-muted">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => changePage(page)}
                className={`h-10 min-w-10 rounded border px-3 text-sm font-black transition ${
                  currentPage === page ? "border-mint bg-mint text-ink" : "border-line bg-ink text-paper hover:border-mint hover:text-mint"
                }`}
              >
                {page}
              </button>
            )
          )}
          <form onSubmit={goToTypedPage} className="flex items-center gap-2 sm:ml-2">
            <label htmlFor="author-books-page" className="text-xs font-bold text-muted">
              Page
            </label>
            <input
              id="author-books-page"
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
            disabled={currentPage === totalPages}
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
