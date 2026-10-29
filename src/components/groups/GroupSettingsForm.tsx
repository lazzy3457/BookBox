"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Settings = {
  description: string;
  rules: string;
  readalongBookId: string | null;
  readalongTitle: string | null;
  readalongLabel: string;
  challengeGoal: string;
  challengeEndsAt: string;
};

// Réglages modérateur : description, règles, lecture commune du mois et défi collectif.
export function GroupSettingsForm({ groupId, initial }: { groupId: string; initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [bookQuery, setBookQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const value = bookQuery.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/books/local?q=${encodeURIComponent(value)}`, { signal: controller.signal }).catch(() => null);
      if (response?.ok) setResults((await response.json()).items ?? []);
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [bookQuery]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        rules: form.rules,
        readalongBookId: form.readalongBookId,
        readalongLabel: form.readalongLabel,
        challengeGoal: form.challengeGoal ? Number(form.challengeGoal) : null,
        challengeEndsAt: form.challengeEndsAt || null
      })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setMessage({ tone: "error", text: payload?.error?.message ?? "Les réglages n'ont pas pu être enregistrés." });
      return;
    }
    setMessage({ tone: "success", text: "Réglages enregistrés." });
    router.refresh();
  }

  const label = "flex flex-col gap-1.5 text-xs font-extrabold text-paper";

  return (
    <form onSubmit={submit} className="bb-card flex h-fit flex-col gap-4 p-5">
      <h2 className="bb-h3">Réglages du groupe</h2>
      <label className={label}>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={600} rows={3} className="bb-input resize-y" /></label>
      <label className={label}>Règles<textarea value={form.rules} onChange={(event) => setForm({ ...form, rules: event.target.value })} maxLength={1500} rows={4} className="bb-input resize-y" placeholder="1. Indique toujours jusqu'où vont les spoilers…" /></label>
      <div className={label}>
        Lecture commune du mois
        {form.readalongBookId ? (
          <span className="flex items-center justify-between gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold">
            {form.readalongTitle}
            <button type="button" onClick={() => setForm({ ...form, readalongBookId: null, readalongTitle: null })} className="text-xs text-mint hover:underline">Retirer</button>
          </span>
        ) : (
          <span className="relative">
            <span className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
              <Search size={14} aria-hidden className="text-muted" />
              <input value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} placeholder="Chercher un livre" className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none" aria-label="Livre de la lecture commune" />
            </span>
            {bookQuery.trim().length >= 2 && results.length ? (
              <span className="bb-card absolute inset-x-0 top-full z-10 mt-1 flex max-h-48 flex-col overflow-y-auto p-1">
                {results.map((result) => (
                  <button key={result.id} type="button" onClick={() => { setForm({ ...form, readalongBookId: result.id, readalongTitle: result.title }); setBookQuery(""); }} className="rounded-lg px-2 py-1.5 text-left text-sm font-bold hover:bg-ink">{result.title}</button>
                ))}
              </span>
            ) : null}
          </span>
        )}
        <input value={form.readalongLabel} onChange={(event) => setForm({ ...form, readalongLabel: event.target.value })} maxLength={120} placeholder="Ex. Semaine 2 · chapitres 1 à 8" className="bb-input font-normal" aria-label="Étape de la lecture commune" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Défi : livres / membre<input type="number" min={1} max={500} value={form.challengeGoal} onChange={(event) => setForm({ ...form, challengeGoal: event.target.value })} className="bb-input" /></label>
        <label className={label}>Jusqu&apos;au<input type="date" value={form.challengeEndsAt} onChange={(event) => setForm({ ...form, challengeEndsAt: event.target.value })} className="bb-input" /></label>
      </div>
      {message ? <p role="status" className={`text-xs font-bold ${message.tone === "success" ? "text-mint" : "text-coral"}`}>{message.text}</p> : null}
      <button type="submit" disabled={busy} className="bb-btn-primary py-2.5">{busy ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
