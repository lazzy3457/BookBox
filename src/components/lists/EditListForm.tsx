"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2, X, GripVertical } from "lucide-react";
import { updateList, deleteList, removeBookFromList, reorderList } from "@/server/actions/lists";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Book = {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
};

type Entry = {
  id: string;
  bookId: string;
  note: string | null;
  order: number;
  book: Book;
};

type Props = {
  list: {
    id: string;
    title: string;
    description: string | null;
    rating: number | null;
    isPublic: boolean;
    entries: Entry[];
  };
};

// ── Ligne draggable ────────────────────────────────────────────────
function SortableEntry({
  entry,
  index,
  onRemove,
  disabled,
}: {
  entry: Entry;
  index: number;
  onRemove: (bookId: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.bookId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded border border-line bg-panelSoft/50 p-3"
    >
      {/* Poignée drag */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted/40 hover:text-muted transition active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical size={16} />
      </button>

      <div className="w-6 shrink-0 text-center text-sm font-black text-muted/50">
        {index + 1}
      </div>

      <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-line bg-panelSoft">
        {entry.book.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-black text-paper">{entry.book.title}</div>
        <div className="text-xs text-muted">{entry.book.authors.join(", ") || "Auteur inconnu"}</div>
      </div>

      <button
        onClick={() => onRemove(entry.bookId)}
        disabled={disabled}
        className="shrink-0 text-muted transition hover:text-coral"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Formulaire principal ───────────────────────────────────────────
export function EditListForm({ list }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [rating, setRating] = useState<number | null>(list.rating);
  const [isPublic, setIsPublic] = useState(list.isPublic);
  const [hovered, setHovered] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>(list.entries);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.bookId === active.id);
    const newIndex = entries.findIndex((e) => e.bookId === over.id);
    const reordered = arrayMove(entries, oldIndex, newIndex);

    setEntries(reordered);

    startTransition(async () => {
      await reorderList(list.id, reordered.map((e) => e.bookId));
    });
  }

  function handleSave() {
    if (!title.trim()) return;
    startTransition(async () => {
      await updateList(list.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        rating: rating ?? undefined,
        isPublic,
      });
      router.push(`/lists/${list.id}`);
    });
  }

  function handleRemoveBook(bookId: string) {
    startTransition(async () => {
      setEntries((prev) => prev.filter((e) => e.bookId !== bookId));
      await removeBookFromList(list.id, bookId);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteList(list.id);
      router.push("/profile");
    });
  }

  return (
    <div className="space-y-5">
      {/* Infos de la liste */}
      <div className="space-y-5 rounded border border-line bg-panel/80 p-7 shadow-poster">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-muted">
            Titre <span className="text-coral">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-line bg-ink/50 px-4 py-3 text-sm text-paper placeholder:text-muted/40 focus:border-mint/60 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-muted">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full resize-none rounded border border-line bg-ink/50 px-4 py-3 text-sm text-paper placeholder:text-muted/40 focus:border-mint/60 focus:outline-none transition"
          />
        </div>

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
              <button onClick={() => setRating(null)} className="ml-2 text-xs text-muted hover:text-paper transition">
                Effacer
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded border border-line bg-panelSoft/50 px-5 py-4">
          <div>
            <div className="text-sm font-black text-paper">
              {isPublic ? "Liste publique" : "Liste privée"}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {isPublic ? "Visible par tous les utilisateurs" : "Visible uniquement par toi"}
            </div>
          </div>
          <button
            onClick={() => setIsPublic((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${isPublic ? "bg-mint" : "bg-line"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="rounded border border-line px-5 py-3 text-sm font-black text-muted transition hover:border-line/80 hover:text-paper"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || pending}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-mint px-5 py-3 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-50"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Livres de la liste */}
      <div className="rounded border border-line bg-panel/80 p-7 shadow-poster">
        <h2 className="mb-1 text-sm font-black uppercase tracking-[0.16em] text-muted">
          Livres dans la liste ({entries.length})
        </h2>
        <p className="mb-4 text-xs text-muted/60">Glisse pour réordonner.</p>

        {entries.length === 0 ? (
          <p className="text-sm text-muted">Aucun livre dans cette liste.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={entries.map((e) => e.bookId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {entries.map((entry, i) => (
                  <SortableEntry
                    key={entry.bookId}
                    entry={entry}
                    index={i}
                    onRemove={handleRemoveBook}
                    disabled={pending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded border border-coral/20 bg-panel/80 p-7 shadow-poster">
        <h2 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-coral">
          Zone de danger
        </h2>
        <p className="mb-4 text-sm text-muted">La suppression est définitive et irréversible.</p>
        {!showConfirmDelete ? (
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center gap-2 rounded border border-coral/40 px-4 py-2.5 text-sm font-black text-coral transition hover:bg-coral/10"
          >
            <Trash2 size={15} />
            Supprimer la liste
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-paper">Confirmer la suppression ?</p>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="flex items-center gap-2 rounded bg-coral px-4 py-2 text-sm font-black text-white transition hover:bg-coral/80 disabled:opacity-50"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Oui, supprimer
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="text-sm text-muted hover:text-paper transition"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}