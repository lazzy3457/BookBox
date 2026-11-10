"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookmarkCheck } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { chapterHref, MAX_CHAPTER } from "@/lib/chapters";

type ChapterProgressControlProps = {
  bookId: string;
  initialChapter: number;
};

function readChapter(value: string, min: number) {
  const chapter = Number(value);
  return Number.isInteger(chapter) && chapter >= min && chapter <= MAX_CHAPTER ? chapter : null;
}

const inputClass = "h-10 w-20 rounded-full border border-line bg-ink px-3 text-center text-sm font-bold text-paper outline-none focus:border-mint";

// « J'en suis au chapitre N » et accès direct à un chapitre.
export function ChapterProgressControl({ bookId, initialChapter }: ChapterProgressControlProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(String(initialChapter));
  const [target, setTarget] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function saveProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chapter = readChapter(progress, 0);
    if (chapter === null) {
      setToast({ tone: "error", message: `Indique un numéro de chapitre entre 0 et ${MAX_CHAPTER}.` });
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/books/${bookId}/chapter-progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter })
    });
    setIsSaving(false);

    if (!response.ok) {
      setToast({ tone: "error", message: "Ta progression n'a pas pu être enregistrée. Réessaie dans un instant." });
      return;
    }

    setToast({ tone: "success", message: chapter ? `Les chapitres 1 à ${chapter} te sont ouverts.` : "Progression remise à zéro." });
    router.refresh();
  }

  function openChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chapter = readChapter(target, 1);
    if (chapter === null) {
      setToast({ tone: "error", message: `Indique un numéro de chapitre entre 1 et ${MAX_CHAPTER}.` });
      return;
    }
    router.push(chapterHref(bookId, chapter));
  }

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <form onSubmit={saveProgress} className="bb-card flex min-w-0 flex-col gap-3 p-4">
        <label htmlFor="chapter-progress" className="font-display text-base font-semibold text-paper">J&apos;en suis au chapitre</label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="chapter-progress" type="number" inputMode="numeric" min={0} max={MAX_CHAPTER} value={progress} onChange={(event) => setProgress(event.target.value)} className={inputClass} />
          <button type="submit" disabled={isSaving} className="bb-btn-primary">
            <BookmarkCheck size={15} aria-hidden />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
        <p className="text-xs text-muted">Les avis des chapitres que tu as lus s&apos;ouvrent, les suivants restent cachés.</p>
      </form>

      <form onSubmit={openChapter} className="bb-card flex min-w-0 flex-col gap-3 p-4">
        <label htmlFor="chapter-target" className="font-display text-base font-semibold text-paper">Aller au chapitre</label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="chapter-target" type="number" inputMode="numeric" min={1} max={MAX_CHAPTER} value={target} onChange={(event) => setTarget(event.target.value)} placeholder="N°" className={inputClass} />
          <button type="submit" className="bb-btn-primary">
            Ouvrir <ArrowRight size={15} aria-hidden />
          </button>
        </div>
        <p className="text-xs text-muted">Pour lire les avis d&apos;un chapitre ou donner le tien.</p>
      </form>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
