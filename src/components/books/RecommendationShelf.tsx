"use client";

import Link from "next/link";
import { BookOpen, Check, EyeOff } from "lucide-react";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

type Item = {
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    publishedDate: string | null;
    pageCount: number | null;
  };
  reason: string;
};

export function RecommendationShelf({ initialItems, compact = false }: { initialItems: Item[]; compact?: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function feedback(bookId: string, action: "dismiss" | "read") {
    const item = items.find((candidate) => candidate.book.id === bookId);
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, action })
    });
    if (response.ok) {
      setItems((current) => current.filter((candidate) => candidate.book.id !== bookId));
      setToast({
        tone: "success",
        message: action === "dismiss"
          ? `« ${item?.book.title ?? "Ce livre"} » ne sera plus recommandé.`
          : `« ${item?.book.title ?? "Ce livre"} » a été marqué comme déjà lu.`
      });
      return;
    }
    setToast({ tone: "error", message: "Ton choix n'a pas pu être enregistré." });
  }

  if (!items.length) return (
    <>
    <div className="rounded border border-line bg-panel/65 p-5 text-sm text-muted">
      Note ou ajoute quelques livres pour faire naître tes recommandations.
    </div>
    {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );

  return (
    <>
      <div className={`grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 ${compact ? "xl:grid-cols-4" : "md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8"}`}>
        {items.map(({ book, reason }) => (
        <article key={book.id} className="group min-w-0">
          <Link href={`/books/${book.id}`} className="block">
            <div className="cover-sheen aspect-[2/3] overflow-hidden rounded border border-line bg-panel shadow-poster transition group-hover:-translate-y-1 group-hover:border-mint/70">
              {book.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : <div className="grid h-full place-items-center"><BookOpen className="text-muted" /></div>}
            </div>
            <h3 className="mt-3 line-clamp-2 text-sm font-black leading-tight text-paper">{book.title}</h3>
            <p className="mt-1 line-clamp-1 text-xs text-muted">{book.authors.join(", ") || "Auteur inconnu"}</p>
          </Link>
          <p className="mt-2 text-[11px] font-bold text-mint">{reason}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => feedback(book.id, "dismiss")} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-coral"><EyeOff size={11} /> Pas intéressé</button>
            <button onClick={() => feedback(book.id, "read")} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-mint"><Check size={11} /> Déjà lu</button>
          </div>
        </article>
        ))}
      </div>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
