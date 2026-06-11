"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { BookCard } from "@/components/books/BookCard";
import { Toast } from "@/components/ui/Toast";

export type ExternalBook = {
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

type ExternalBookGridProps = {
  books: ExternalBook[];
};

function formatEdition(book: ExternalBook) {
  return [book.publisher, book.publishedDate, book.pageCount ? `${book.pageCount} pages` : null, book.language?.toUpperCase()]
    .filter(Boolean)
    .join(" - ");
}

function bookKey(book: ExternalBook) {
  return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? `${book.title}-${book.authors.join(",")}`;
}

function sourceLabel(book: ExternalBook) {
  return book.source === "open_library" ? "Open Library" : "Google Books";
}

export function ExternalBookGrid({ books }: ExternalBookGridProps) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function openBook(book: ExternalBook) {
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

  if (!books.length) {
    return null;
  }

  return (
    <div>
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
        {books.map((book) => {
          const key = bookKey(book);
          const isSaving = savingId === key;

          return (
            <div key={key}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openBook(book)}
                  disabled={isSaving}
                  className="block w-full text-left disabled:cursor-wait disabled:opacity-70"
                >
                  <BookCard book={book} variant="poster" showScore={false} />
                </button>
                <div className="absolute left-2 top-2 rounded bg-ink/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-paper shadow-poster">
                  {sourceLabel(book)}
                </div>
              </div>
              {formatEdition(book) ? (
                <div className="mt-2 rounded border border-line bg-panel/70 px-2 py-1 text-[11px] font-bold leading-4 text-muted">
                  {formatEdition(book)}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => openBook(book)}
                disabled={isSaving}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded border border-line bg-ink px-3 py-2 text-xs font-black text-paper transition hover:border-mint hover:text-mint disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? <Plus size={14} /> : <ArrowRight size={14} />}
                {isSaving ? "Ouverture..." : "Voir la fiche"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
