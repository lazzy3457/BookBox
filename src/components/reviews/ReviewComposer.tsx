"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { RatingControl } from "@/components/reviews/RatingControl";
import { Toast } from "@/components/ui/Toast";

type ReviewComposerProps = {
  bookId: string;
  hasUserReview?: boolean;
};

export function ReviewComposer({ bookId, hasUserReview = false }: ReviewComposerProps) {
  const router = useRouter();
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasUserReview) {
      setToast({
        tone: "info",
        message: "Tu as deja une review sur ce livre. Utilise le bouton modifier sur ta review pour la mettre a jour."
      });
      return;
    }

    setIsSaving(true);
    setToast(null);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, rating, body: body || undefined, spoiler })
    });

    setIsSaving(false);

    if (!response.ok) {
      setToast({
        tone: response.status === 409 ? "info" : "error",
        message:
          response.status === 409
            ? "Tu as deja publie une review pour ce livre. Tu peux modifier ta review existante."
            : "La review n'a pas pu etre publiee. Reessaie dans un instant."
      });
      return;
    }

    setBody("");
    setSpoiler(false);
    setToast({ tone: "success", message: "Ta review est publiee." });
    router.refresh();
  }

  return (
    <form onSubmit={submitReview} className="w-full min-w-0 max-w-full overflow-hidden rounded border border-line bg-panel/90 p-4 shadow-poster sm:p-5">
      <div className="mb-4 grid min-w-0 gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-paper">Publier une review</h2>
          <p className="mt-1 text-sm text-muted">La note suffit, le texte peut venir plus tard.</p>
        </div>
        <RatingControl value={rating} onChange={setRating} />
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-32 w-full resize-y rounded border border-line bg-ink px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted/45 focus:border-mint"
        placeholder="Une impression, une phrase, ou rien du tout."
      />

      <div className="mt-4 grid gap-4 sm:flex sm:items-center sm:justify-between">
        <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
          Contient des spoilers
        </label>
        <button
          type="submit"
          disabled={isSaving || hasUserReview}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-mint px-4 py-2 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-60 sm:w-auto"
        >
          <Send size={16} />
          {hasUserReview ? "Review deja publiee" : isSaving ? "Publication..." : "Publier"}
        </button>
      </div>

      {hasUserReview ? (
        <p className="mt-3 rounded border border-line bg-ink/55 px-3 py-2 text-sm text-muted">
          Tu ne peux publier qu'une seule review par livre. Tu peux modifier ta review existante plus bas.
        </p>
      ) : null}
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </form>
  );
}
