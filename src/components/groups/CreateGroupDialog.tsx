"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe, Lock, Plus, Search, X } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { GroupEmblem, emblemKeys } from "@/components/groups/GroupEmblem";

type Topic = "BOOK" | "AUTHOR" | "GENRE" | "CHALLENGE" | "FREE";
type PickedBook = { id: string; title: string; authors: string[]; thumbnailUrl: string | null };

const topics: Array<[Topic, string]> = [
  ["BOOK", "Un livre"],
  ["AUTHOR", "Un auteur"],
  ["GENRE", "Un genre"],
  ["CHALLENGE", "Un défi"],
  ["FREE", "Libre"]
];

const topicPlaceholders: Partial<Record<Topic, string>> = {
  AUTHOR: "Ex. Haruki Murakami",
  GENRE: "Ex. Polar & noir",
  CHALLENGE: "Ex. 50 livres en 2026"
};

export function CreateGroupButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="bb-btn-primary px-5 py-2.5 text-sm">
        <Plus size={16} aria-hidden />
        Créer un groupe
      </button>
      {open ? <CreateGroupDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState<Topic>("BOOK");
  const [topicLabel, setTopicLabel] = useState("");
  const [challengeGoal, setChallengeGoal] = useState("12");
  const [book, setBook] = useState<PickedBook | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<PickedBook[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "INVITE">("PUBLIC");
  const [emblem, setEmblem] = useState("book");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.querySelector("input")?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  // Recherche parmi les livres déjà présents sur BooksBox.
  useEffect(() => {
    const value = bookQuery.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/books/local?q=${encodeURIComponent(value)}`, { signal: controller.signal }).catch(() => null);
      if (response?.ok) setBookResults((await response.json()).items ?? []);
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [bookQuery]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        topic,
        topicLabel: topicLabel || null,
        bookId: topic === "BOOK" ? book?.id ?? null : null,
        visibility,
        emblem,
        challengeGoal: topic === "CHALLENGE" ? Number(challengeGoal) || null : null
      })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message ?? "Le groupe n'a pas pu être créé.");
      return;
    }
    router.push(`/groups/${payload.group.slug}`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button type="button" aria-label="Fermer" onClick={onClose} className="fixed inset-0 bg-paper/35 backdrop-blur-[2px]" />
      <form ref={dialogRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-group-title" className="bb-card relative flex w-full max-w-[580px] flex-col gap-5 p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-group-title" className="font-display text-3xl font-semibold text-paper">Créer un groupe</h2>
            <p className="mt-1 text-xs text-muted">Rassemble des lecteurs autour d&apos;un livre, d&apos;un genre ou d&apos;un défi.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-full bg-ink text-muted hover:text-paper"><X size={15} /></button>
        </div>

        <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
          Nom du groupe
          <input required minLength={3} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Les Fremen d'Arrakis" className="bb-input" />
        </label>

        <label className="flex flex-col gap-2 text-xs font-extrabold text-paper">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} rows={3} placeholder="De quoi allez-vous parler ? Quelles sont les règles sur les spoilers ?" className="bb-input resize-y" />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-paper">Autour de…</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Thème du groupe">
            {topics.map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={topic === value} onClick={() => setTopic(value)} className={`bb-chip ${topic === value ? "bb-chip-active" : ""}`}>{label}</button>
            ))}
          </div>
          {topic === "BOOK" ? (
            book ? (
              <div className="flex items-center gap-3 rounded-xl bg-ink p-3">
                <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-11 w-7 rounded-md" iconSize={0} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-semibold text-paper">{book.title}</span>
                  <span className="block truncate text-[11px] text-muted">{book.authors[0] ?? "Auteur inconnu"} · livre lié au groupe</span>
                </span>
                <button type="button" onClick={() => setBook(null)} className="text-xs font-extrabold text-mint hover:underline">Changer</button>
              </div>
            ) : (
              <div className="relative">
                <label className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
                  <Search size={15} aria-hidden className="text-muted" />
                  <span className="sr-only">Chercher le livre du groupe</span>
                  <input value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} placeholder="Chercher un livre déjà sur BooksBox" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-muted" />
                </label>
                {bookQuery.trim().length >= 2 && bookResults.length ? (
                  <ul className="bb-card absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto p-1">
                    {bookResults.map((result) => (
                      <li key={result.id}>
                        <button type="button" onClick={() => { setBook(result); setBookQuery(""); if (!name) setName(result.title); }} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-ink">
                          <BookCover title={result.title} thumbnailUrl={result.thumbnailUrl} className="h-9 w-6 rounded" iconSize={0} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-paper">{result.title}</span>
                            <span className="block truncate text-[11px] text-muted">{result.authors[0]}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          ) : topic !== "FREE" ? (
            <div className="flex gap-2">
              <input required value={topicLabel} onChange={(event) => setTopicLabel(event.target.value)} maxLength={120} placeholder={topicPlaceholders[topic]} className="bb-input flex-1" aria-label="Précision du thème" />
              {topic === "CHALLENGE" ? (
                <label className="flex items-center gap-2 text-xs font-bold text-muted">
                  <input type="number" min={1} max={500} value={challengeGoal} onChange={(event) => setChallengeGoal(event.target.value)} className="bb-input w-20" aria-label="Livres à lire par membre" />
                  livres / membre
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-paper">Qui peut rejoindre ?</p>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Visibilité">
            {([
              ["PUBLIC", Globe, "Public", "Tout le monde peut rejoindre et lire"],
              ["INVITE", Lock, "Sur invitation", "Seuls les membres invités voient le groupe"]
            ] as const).map(([value, Icon, title, text]) => (
              <button key={value} type="button" role="radio" aria-checked={visibility === value} onClick={() => setVisibility(value)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${visibility === value ? "border-mint bg-panel ring-1 ring-mint" : "border-line bg-ink"}`}>
                <Icon size={17} aria-hidden className="mt-0.5 text-paper" />
                <span>
                  <span className="block text-[13px] font-extrabold text-paper">{title}</span>
                  <span className="block text-[11px] text-muted">{text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-paper">Emblème</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Emblème">
            {emblemKeys.map((key) => (
              <button key={key} type="button" role="radio" aria-checked={emblem === key} aria-label={key} onClick={() => setEmblem(key)} className={`rounded-xl ${emblem === key ? "ring-2 ring-mint" : ""}`}>
                <GroupEmblem emblem={key} size={36} className={emblem === key ? "!bg-mint !text-ink" : "!bg-ink !shadow-none"} />
              </button>
            ))}
          </div>
        </div>

        {error ? <p role="alert" className="text-sm font-bold text-coral">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="bb-btn-soft px-5 py-2.5 text-sm">Annuler</button>
          <button type="submit" disabled={busy} className="bb-btn-primary px-5 py-2.5 text-sm">{busy ? "Création…" : "Créer le groupe"}</button>
        </div>
      </form>
    </div>
  );
}
