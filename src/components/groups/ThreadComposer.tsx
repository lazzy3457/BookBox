"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BookOpen, MessageSquareText, Plus, SlidersHorizontal, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type ThreadType = "DEBATE" | "POLL" | "READALONG" | "ANNOUNCEMENT";

const typeButtons: Array<{ type: ThreadType; label: string; icon: typeof Bell; className: string }> = [
  { type: "DEBATE", label: "Débat", icon: MessageSquareText, className: "bg-mint/[0.08] text-mint" },
  { type: "POLL", label: "Sondage", icon: SlidersHorizontal, className: "bg-[#5f7e93]/10 text-[#4d6a7d]" },
  { type: "READALONG", label: "Lecture commune", icon: BookOpen, className: "bg-coral/10 text-coral" },
  { type: "ANNOUNCEMENT", label: "Annonce", icon: Bell, className: "bg-amber/10 text-amber" }
];

type ThreadComposerProps = {
  groupId: string;
  groupSlug: string;
  viewerName: string | null;
  viewerImage: string | null;
  isModerator: boolean;
  readalongBookId: string | null;
};

export function ThreadComposer({ groupId, groupSlug, viewerName, viewerImage, isModerator, readalongBookId }: ThreadComposerProps) {
  const router = useRouter();
  const [type, setType] = useState<ThreadType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoilerLevel, setSpoilerLevel] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closesIn, setClosesIn] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = typeButtons.filter((button) => button.type !== "ANNOUNCEMENT" || isModerator);

  function reset() {
    setType(null);
    setTitle("");
    setBody("");
    setSpoilerLevel("");
    setOptions(["", ""]);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!type) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/groups/${groupId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        body: body || null,
        spoilerLevel: spoilerLevel || null,
        bookId: type === "READALONG" ? readalongBookId : null,
        pollOptions: type === "POLL" ? options : undefined,
        pollClosesInDays: type === "POLL" ? Number(closesIn) || null : null
      })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message ?? "La discussion n'a pas pu être publiée.");
      return;
    }
    reset();
    router.push(`/groups/${groupSlug}/threads/${payload.thread.id}`);
  }

  return (
    <section className="bb-card flex gap-4 p-5">
      <Avatar name={viewerName} image={viewerImage} size={36} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {!type ? (
          <>
            <button type="button" onClick={() => setType("DEBATE")} className="w-full rounded-full bg-ink px-4 py-2.5 text-left text-sm text-muted hover:text-paper">
              Lance un débat, un sondage ou une lecture commune…
            </button>
            <div className="flex flex-wrap gap-2">
              {available.map((button) => (
                <button key={button.type} type="button" onClick={() => setType(button.type)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${button.className}`}>
                  <button.icon size={13} aria-hidden />
                  {button.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Type de discussion">
              {available.map((button) => (
                <button key={button.type} type="button" role="radio" aria-checked={type === button.type} onClick={() => setType(button.type)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${type === button.type ? "bg-mint text-ink" : button.className}`}>
                  <button.icon size={13} aria-hidden />
                  {button.label}
                </button>
              ))}
              <button type="button" onClick={reset} aria-label="Annuler" className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-ink text-muted hover:text-paper"><X size={14} /></button>
            </div>
            <label className="sr-only" htmlFor="thread-title">Titre</label>
            <input id="thread-title" required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === "POLL" ? "Ta question (ex. Quel tome lire en novembre ?)" : type === "READALONG" ? "Ex. Le Messie de Dune — chapitres 1 à 8" : "Le sujet de la discussion"} className="bb-input" autoFocus />
            <label className="sr-only" htmlFor="thread-body">Message</label>
            <textarea id="thread-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={3} placeholder="Développe ton idée (facultatif)" className="bb-input resize-y" />
            {type === "POLL" ? (
              <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                  <input key={index} value={option} onChange={(event) => setOptions((current) => current.map((value, position) => (position === index ? event.target.value : value)))} maxLength={100} placeholder={`Réponse ${index + 1}`} className="bb-input" aria-label={`Réponse ${index + 1}`} />
                ))}
                <div className="flex flex-wrap items-center gap-3">
                  {options.length < 6 ? (
                    <button type="button" onClick={() => setOptions((current) => [...current, ""])} className="inline-flex items-center gap-1 text-xs font-extrabold text-mint hover:underline">
                      <Plus size={13} aria-hidden />
                      Ajouter une réponse
                    </button>
                  ) : null}
                  <label className="ml-auto flex items-center gap-2 text-xs font-bold text-muted">
                    Se termine dans
                    <select value={closesIn} onChange={(event) => setClosesIn(event.target.value)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-paper">
                      {["1", "2", "3", "7", "14"].map((days) => <option key={days} value={days}>{days} jour{days === "1" ? "" : "s"}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              Spoilers jusqu&apos;à… (laisse vide si sans spoiler)
              <input value={spoilerLevel} onChange={(event) => setSpoilerLevel(event.target.value)} maxLength={60} placeholder="Ex. tome 1, chapitre 8" className="bb-input" />
            </label>
            {error ? <p role="alert" className="text-xs font-bold text-coral">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={reset} className="bb-btn-ghost">Annuler</button>
              <button type="submit" disabled={busy} className="bb-btn-primary px-5">{busy ? "Publication…" : "Publier"}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
