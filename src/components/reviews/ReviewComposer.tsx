"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { RatingControl } from "@/components/reviews/RatingControl";

type ReviewComposerProps = {
  bookId: string;
};

export function ReviewComposer({ bookId }: ReviewComposerProps) {
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, rating, body: body || undefined, spoiler })
    });

    setIsSaving(false);
    setMessage(response.ok ? "Review enregistrée. Joli petit rituel accompli." : "Impossible d'enregistrer la review.");
  }

  return (
    <form onSubmit={submitReview} className="rounded border border-line bg-panel/90 p-5 shadow-poster">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
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

      <div className="mt-4 flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
          Contient des spoilers
        </label>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded bg-mint px-4 py-2 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-60"
        >
          <Send size={16} />
          {isSaving ? "Publication..." : "Publier"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-mint">{message}</p> : null}
    </form>
  );
}
