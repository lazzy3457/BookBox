"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Loader2, Star } from "lucide-react";
import { createList } from "@/server/actions/lists";

export function NewListForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const list = await createList({
        title: title.trim(),
        description: description.trim() || undefined,
        rating: rating ?? undefined,
        isPublic,
      });
      router.push(`/lists/${list.id}`);
    });
  }

  return (
    <div className="space-y-5 rounded border border-line bg-panel/80 p-7 shadow-poster">
      {/* Titre */}
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-muted">
          Titre <span className="text-coral">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Saga Harry Potter, Mes romans noirs préférés…"
          className="w-full rounded border border-line bg-ink/50 px-4 py-3 text-sm text-paper placeholder:text-muted/40 focus:border-mint/60 focus:outline-none transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-muted">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Quelques mots sur cette liste…"
          rows={4}
          className="w-full resize-none rounded border border-line bg-ink/50 px-4 py-3 text-sm text-paper placeholder:text-muted/40 focus:border-mint/60 focus:outline-none transition"
        />
      </div>

      {/* Note globale */}
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-muted">
          Note globale
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = (hovered ?? rating ?? 0) >= star;
            return (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                className="transition"
              >
                <Star
                  size={28}
                  className={active ? "text-amber" : "text-muted/30"}
                  fill={active ? "currentColor" : "none"}
                />
              </button>
            );
          })}
          {rating != null && (
            <span className="ml-2 text-sm font-black text-amber">{rating}/5</span>
          )}
          {rating != null && (
            <button
              onClick={() => setRating(null)}
              className="ml-2 text-xs text-muted hover:text-paper transition"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Visibilité */}
      <div className="flex items-center justify-between rounded border border-line bg-panelSoft/50 px-5 py-4">
        <div>
          <div className="text-sm font-black text-paper">
            {isPublic ? "Liste publique" : "Liste privée"}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {isPublic
              ? "Visible par tous les utilisateurs"
              : "Visible uniquement par toi"}
          </div>
        </div>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={`relative h-7 w-12 rounded-full transition-colors ${isPublic ? "bg-mint" : "bg-line"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="rounded border border-line px-5 py-3 text-sm font-black text-muted transition hover:border-line/80 hover:text-paper"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || pending}
          className="flex flex-1 items-center justify-center gap-2 rounded bg-mint px-5 py-3 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-50"
        >
          {pending
            ? <Loader2 size={16} className="animate-spin" />
            : <ListPlus size={16} />
          }
          Créer la liste
        </button>
      </div>
    </div>
  );
}