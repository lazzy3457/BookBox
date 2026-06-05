"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Plus, List, Check, Loader2 } from "lucide-react";
import { getUserLists, createList, addBookToList, removeBookFromList } from "@/server/actions/lists";

type BookList = {
  id: string;
  title: string;
  isPublic: boolean;
  _count: { entries: number };
};

type Props = {
  bookId: string;
  onClose: () => void;
};

type View = "lists" | "create";

export function AddToListModal({ bookId, onClose }: Props) {
  const [view, setView] = useState<View>("lists");
  const [lists, setLists] = useState<BookList[]>([]);
  const [activeListIds, setActiveListIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  // Formulaire création
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getUserLists();
      setLists(data);

      // Pré-cocher les listes qui contiennent déjà ce livre
      const res = await fetch(`/api/lists/book/${bookId}`);
      if (res.ok) {
        const ids: string[] = await res.json();
        setActiveListIds(new Set(ids));
      }
      setLoading(false);
    }
    load();
  }, [bookId]);

  function toggleList(listId: string) {
    startTransition(async () => {
      if (activeListIds.has(listId)) {
        setActiveListIds((prev) => { const next = new Set(prev); next.delete(listId); return next; });
        await removeBookFromList(listId, bookId);
      } else {
        setActiveListIds((prev) => new Set(prev).add(listId));
        await addBookToList({ listId, bookId });
      }
    });
  }

  function handleCreate() {
    if (!title.trim()) return;
    startTransition(async () => {
      const list = await createList({ title: title.trim(), description: description.trim() || undefined, isPublic });
      await addBookToList({ listId: list.id, bookId });
      setLists((prev) => [{ ...list, _count: { entries: 1 } }, ...prev]);
      setActiveListIds((prev) => new Set(prev).add(list.id));
      setView("lists");
      setTitle("");
      setDescription("");
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded border border-line bg-panel shadow-poster">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            {view === "create" && (
              <button onClick={() => setView("lists")} className="mr-1 text-muted hover:text-paper transition">
                ←
              </button>
            )}
            <List size={16} className="text-mint" />
            <span className="text-sm font-black text-paper">
              {view === "lists" ? "Ajouter à une liste" : "Nouvelle liste"}
            </span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-paper transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {view === "lists" ? (
            <>
              {/* Bouton créer */}
              <button
                onClick={() => setView("create")}
                className="mb-4 flex w-full items-center gap-3 rounded border border-dashed border-line bg-panelSoft/50 px-4 py-3 text-sm font-bold text-mint transition hover:border-mint/60 hover:bg-panelSoft"
              >
                <Plus size={15} />
                Créer une nouvelle liste
              </button>

              {/* Listes existantes */}
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-muted" />
                </div>
              ) : lists.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  Aucune liste pour l'instant.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {lists.map((list) => {
                    const active = activeListIds.has(list.id);
                    return (
                      <button
                        key={list.id}
                        onClick={() => toggleList(list.id)}
                        disabled={pending}
                        className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left transition
                          ${active
                            ? "border-mint/60 bg-mint/10 text-paper"
                            : "border-line bg-panelSoft/50 text-muted hover:border-line/80 hover:text-paper"
                          }`}
                      >
                        <div>
                          <div className="text-sm font-black">{list.title}</div>
                          <div className="mt-0.5 text-xs text-muted">
                            {list._count.entries} livre{list._count.entries !== 1 ? "s" : ""} · {list.isPublic ? "Publique" : "Privée"}
                          </div>
                        </div>
                        {active && <Check size={15} className="shrink-0 text-mint" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Formulaire création */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Titre <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Saga Harry Potter"
                  className="w-full rounded border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/50 focus:border-mint/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Une courte description de ta liste..."
                  rows={3}
                  className="w-full resize-none rounded border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/50 focus:border-mint/60 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded border border-line bg-panelSoft/50 px-4 py-3">
                <div>
                  <div className="text-sm font-black text-paper">Publique</div>
                  <div className="text-xs text-muted">Visible par les autres utilisateurs</div>
                </div>
                <button
                  onClick={() => setIsPublic((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? "bg-mint" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              <button
                onClick={handleCreate}
                disabled={!title.trim() || pending}
                className="flex w-full items-center justify-center gap-2 rounded bg-mint px-4 py-3 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-50"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Créer et ajouter
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}