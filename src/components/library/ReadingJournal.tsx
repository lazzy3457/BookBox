"use client";

import { CalendarDays, Lock, Pencil, Plus, RotateCcw, Trash2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Toast } from "@/components/ui/Toast";

type Entry = {
  id: string;
  entryDate: string;
  page: number | null;
  percentage: number | null;
  chapter: string | null;
  note: string | null;
  isPublic: boolean;
};

type Period = {
  id: string;
  startedAt: string | null;
  finishedAt: string | null;
  isReread: boolean;
  entries: Entry[];
};

export function ReadingJournal({ bookId, periods: initialPeriods }: { bookId: string; periods: Period[] }) {
  const router = useRouter();
  const [periods, setPeriods] = useState(initialPeriods);
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialPeriods[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const selected = useMemo(() => periods.find((period) => period.id === selectedPeriodId), [periods, selectedPeriodId]);

  async function request(body: object, method = "POST") {
    const response = await fetch("/api/reading-journal", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Le journal n'a pas pu être mis à jour.");
    return payload;
  }

  async function addPeriod() {
    setBusy(true);
    try {
      const payload = await request({
        type: "period",
        bookId,
        startedAt: new Date().toISOString().slice(0, 10),
        finishedAt: null,
        isReread: periods.length > 0
      });
      const period = { ...payload.period, startedAt: payload.period.startedAt, finishedAt: payload.period.finishedAt };
      setPeriods((current) => [period, ...current]);
      setSelectedPeriodId(period.id);
      setToast({ tone: "success", message: periods.length ? "Nouvelle relecture créée." : "Lecture créée." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  async function updateDates(formData: FormData) {
    if (!selected) return;
    setBusy(true);
    try {
      const payload = await request({
        periodId: selected.id,
        startedAt: String(formData.get("startedAt") || "") || null,
        finishedAt: String(formData.get("finishedAt") || "") || null
      }, "PATCH");
      setPeriods((current) => current.map((period) => period.id === selected.id ? { ...period, ...payload.period } : period));
      setToast({ tone: "success", message: "Dates de lecture enregistrées." });
      setDatesOpen(false);
      router.refresh();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  async function addEntry(formData: FormData) {
    if (!selected) return;
    setBusy(true);
    try {
      const number = (name: string) => {
        const value = String(formData.get(name) || "");
        return value ? Number(value) : null;
      };
      const input = {
        periodId: selected.id,
        entryDate: String(formData.get("entryDate")),
        page: number("page"),
        percentage: number("percentage"),
        chapter: String(formData.get("chapter") || "") || null,
        note: String(formData.get("note") || "") || null,
        isPublic: formData.get("isPublic") === "on"
      };
      let payload: { entry: Entry };
      if (editingEntry) {
        const response = await fetch(`/api/reading-journal/${editingEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });
        const responsePayload = await response.json() as { entry?: Entry; error?: { message?: string } };
        if (!response.ok || !responsePayload.entry) throw new Error(responsePayload.error?.message ?? "Cette entrée n'a pas pu être modifiée.");
        payload = { entry: responsePayload.entry };
        setPeriods((current) => current.map((period) =>
          period.id === selected.id
            ? { ...period, entries: period.entries.map((entry) => entry.id === editingEntry.id ? payload.entry : entry) }
            : period
        ));
        setToast({ tone: "success", message: "Entrée modifiée." });
      } else {
        payload = await request(input) as { entry: Entry };
        setPeriods((current) => current.map((period) =>
          period.id === selected.id ? { ...period, entries: [payload.entry, ...period.entries] } : period
        ));
        setToast({ tone: "success", message: "Entrée ajoutée au journal." });
      }
      setEntryOpen(false);
      setEditingEntry(null);
      router.refresh();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  function openNewEntry() {
    setEditingEntry(null);
    setEntryOpen(true);
  }

  function openEntryEditor(entry: Entry) {
    setEditingEntry(entry);
    setEntryOpen(true);
  }

  async function removeEntry(entryId: string) {
    const response = await fetch(`/api/reading-journal/${entryId}`, { method: "DELETE" });
    if (!response.ok) {
      setToast({ tone: "error", message: "Cette entrée n'a pas pu être supprimée." });
      return;
    }
    setPeriods((current) => current.map((period) => ({
      ...period,
      entries: period.entries.filter((entry) => entry.id !== entryId)
    })));
  }

  return (
    <>
      <section className="overflow-hidden rounded border border-line bg-panel/80 shadow-poster">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-mint">Journal de lecture</div>
            <h2 className="mt-1 text-lg font-black text-paper">Suivre ma progression</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected ? (
              <>
                <button type="button" onClick={() => setDatesOpen(true)} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black text-muted transition hover:border-mint/50 hover:text-paper">
                  <Pencil size={13} /> Dates
                </button>
                <button type="button" onClick={openNewEntry} className="inline-flex items-center gap-2 rounded bg-mint px-4 py-2 text-xs font-black text-ink transition hover:bg-lime">
                  <Plus size={14} /> Ajouter une entrée
                </button>
              </>
            ) : null}
            <button disabled={busy} onClick={addPeriod} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black text-muted transition hover:border-mint/50 hover:text-paper">
              <RotateCcw size={13} /> {periods.length ? "Relecture" : "Commencer"}
            </button>
          </div>
        </div>

        {periods.length ? (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-line bg-ink/35 px-4 pt-3 sm:px-5">
              {periods.map((period, index) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                  className={`shrink-0 border-b-2 px-3 pb-3 text-xs font-black transition ${
                    selectedPeriodId === period.id ? "border-mint text-paper" : "border-transparent text-muted hover:text-paper"
                  }`}
                >
                  {period.isReread ? `Relecture ${periods.length - index}` : "Première lecture"}
                </button>
              ))}
            </div>

            {selected ? (
              <div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-3 text-xs text-muted sm:px-5">
                  <span><strong className="text-paper">Début</strong> {selected.startedAt ? new Date(selected.startedAt).toLocaleDateString("fr-FR") : "non renseigné"}</span>
                  <span><strong className="text-paper">Fin</strong> {selected.finishedAt ? new Date(selected.finishedAt).toLocaleDateString("fr-FR") : "lecture en cours"}</span>
                  <span>{selected.entries.length} entrée{selected.entries.length > 1 ? "s" : ""}</span>
                </div>

                <div className="divide-y divide-line">
                  {selected.entries.map((entry) => (
                    <article key={entry.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-start sm:px-5">
                      <time className="text-xs font-black uppercase text-muted" dateTime={entry.entryDate}>
                        {new Date(entry.entryDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </time>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-paper">
                          {[entry.chapter ? `Chapitre ${entry.chapter}` : null, entry.page ? `page ${entry.page}` : null, entry.percentage != null ? `${entry.percentage}%` : null].filter(Boolean).join(" · ") || "Note de lecture"}
                        </div>
                        {entry.note ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{entry.note}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                          {entry.isPublic ? <Users size={12} /> : <Lock size={12} />}{entry.isPublic ? "Public" : "Privé"}
                        </span>
                        <button onClick={() => openEntryEditor(entry)} className="text-muted transition hover:text-mint" aria-label="Modifier cette entrée"><Pencil size={14} /></button>
                        <button onClick={() => removeEntry(entry.id)} className="text-muted transition hover:text-coral" aria-label="Supprimer cette entrée"><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                  {!selected.entries.length ? (
                    <div className="px-5 py-8 text-center">
                      <CalendarDays className="mx-auto text-muted/50" size={22} />
                      <p className="mt-3 text-sm text-muted">Aucune entrée pour cette lecture.</p>
                      <button onClick={openNewEntry} className="mt-3 text-xs font-black text-mint">Ajouter ma première progression</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted">Commence une lecture pour enregistrer tes chapitres et ta progression.</div>
        )}
      </section>

      {entryOpen && selected ? (
        <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="reading-entry-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t border border-line bg-panel shadow-2xl sm:max-w-xl sm:rounded">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-mint">Journal</div>
                <h3 id="reading-entry-title" className="mt-1 text-xl font-black text-paper">{editingEntry ? "Modifier l’entrée" : "Ajouter une entrée"}</h3>
              </div>
              <button onClick={() => setEntryOpen(false)} className="grid h-9 w-9 place-items-center rounded text-muted hover:bg-white/5 hover:text-paper" aria-label="Fermer"><X size={18} /></button>
            </div>
            <form action={addEntry} className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-black text-muted sm:col-span-2">Date
                <input required name="entryDate" type="date" defaultValue={editingEntry?.entryDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-mint" />
              </label>
              <label className="text-xs font-black text-muted">Chapitre
                <input name="chapter" defaultValue={editingEntry?.chapter ?? ""} maxLength={120} placeholder="Ex. 12 — Le départ" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-mint" />
              </label>
              <label className="text-xs font-black text-muted">Page
                <input name="page" defaultValue={editingEntry?.page ?? ""} type="number" min="1" placeholder="Ex. 184" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-mint" />
              </label>
              <label className="text-xs font-black text-muted sm:col-span-2">Progression
                <div className="mt-2 flex items-center gap-3">
                  <input name="percentage" defaultValue={editingEntry?.percentage ?? ""} type="number" min="0" max="100" placeholder="0–100" className="h-11 min-w-0 flex-1 rounded border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-mint" />
                  <span className="font-black text-muted">%</span>
                </div>
              </label>
              <label className="text-xs font-black text-muted sm:col-span-2">Note personnelle
                <textarea name="note" defaultValue={editingEntry?.note ?? ""} maxLength={2000} placeholder="Une impression, une citation, un détail à retenir…" className="mt-2 min-h-28 w-full resize-y rounded border border-line bg-ink p-3 text-sm text-paper outline-none focus:border-mint" />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-muted sm:col-span-2">
                <input name="isPublic" type="checkbox" defaultChecked={editingEntry?.isPublic ?? false} className="h-4 w-4 accent-mint" /> Partager cette entrée sur mon profil
              </label>
              <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
                <button type="button" onClick={() => setEntryOpen(false)} className="rounded px-4 py-2 text-sm font-bold text-muted">Annuler</button>
                <button disabled={busy} className="rounded bg-mint px-5 py-2.5 text-sm font-black text-ink">{editingEntry ? "Enregistrer les modifications" : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {datesOpen && selected ? (
        <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="reading-dates-title" className="w-full rounded-t border border-line bg-panel shadow-2xl sm:max-w-md sm:rounded">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="reading-dates-title" className="text-lg font-black text-paper">Dates de lecture</h3>
              <button onClick={() => setDatesOpen(false)} className="grid h-9 w-9 place-items-center rounded text-muted hover:text-paper" aria-label="Fermer"><X size={18} /></button>
            </div>
            <form action={updateDates} className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-black text-muted">Commencée le
                <input name="startedAt" type="date" defaultValue={selected.startedAt?.slice(0, 10)} className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-mint" />
              </label>
              <label className="text-xs font-black text-muted">Terminée le
                <input name="finishedAt" type="date" defaultValue={selected.finishedAt?.slice(0, 10)} className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-mint" />
              </label>
              <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
                <button type="button" onClick={() => setDatesOpen(false)} className="rounded px-4 py-2 text-sm font-bold text-muted">Annuler</button>
                <button disabled={busy} className="rounded bg-mint px-5 py-2.5 text-sm font-black text-ink">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
