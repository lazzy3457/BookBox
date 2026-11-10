"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, Eye, Lock } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { chapterHref } from "@/lib/chapters";
import { plural } from "@/lib/format";

type ChapterGateProps = {
  bookId: string;
  chapter: number;
  reviewsCount: number;
  isSignedIn: boolean;
};

// Écran affiché à la place des avis tant que le lecteur n'a pas atteint le chapitre.
export function ChapterGate({ bookId, chapter, reviewsCount, isSignedIn }: ChapterGateProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markRead() {
    setIsSaving(true);
    setFailed(false);
    const response = await fetch(`/api/books/${bookId}/chapter-progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter })
    });
    setIsSaving(false);

    if (!response.ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <section className="flex flex-col items-start gap-4 rounded border border-coral/30 bg-coral/5 p-5 sm:p-6">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-coral/15 text-coral">
        <Lock size={20} aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="bb-h3">Tu n&apos;as pas encore atteint ce chapitre</h2>
        <p className="text-sm text-muted">
          {reviewsCount ? `${plural(reviewsCount, "avis", "avis")} t'${reviewsCount > 1 ? "attendent" : "attend"} ici. ` : ""}
          Les avis de ce chapitre dévoilent l&apos;histoire jusqu&apos;à ce point : ils restent cachés tant que tu ne l&apos;as pas lu.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isSignedIn ? (
          <button type="button" onClick={markRead} disabled={isSaving} className="bb-btn-primary">
            <BookmarkCheck size={15} aria-hidden />
            {isSaving ? "Enregistrement..." : `J'ai lu le chapitre ${chapter}`}
          </button>
        ) : (
          <Link href={`/login?callbackUrl=${chapterHref(bookId, chapter)}`} className="bb-btn-primary">
            Me connecter pour suivre ma lecture
          </Link>
        )}
        <Link href={`${chapterHref(bookId, chapter)}?reveler=1`} className="bb-btn border border-coral/40 text-coral hover:bg-coral/10">
          <Eye size={15} aria-hidden />
          Révéler quand même
        </Link>
      </div>
      {failed ? <Toast message="Ta progression n'a pas pu être enregistrée. Réessaie dans un instant." tone="error" onClose={() => setFailed(false)} /> : null}
    </section>
  );
}
