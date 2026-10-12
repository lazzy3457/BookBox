"use client";

import { Flag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";

type TargetType = "USER" | "REVIEW" | "COMMENT";

const reasons = [
  ["SPAM", "Spam ou publicité"],
  ["HARASSMENT", "Harcèlement"],
  ["HATE_SPEECH", "Discours haineux"],
  ["SPOILER", "Spoiler non signalé"],
  ["INAPPROPRIATE_CONTENT", "Contenu inapproprié"],
  ["OTHER", "Autre raison"]
] as const;

export function ReportButton({
  targetType,
  targetId,
  label = "Signaler",
  compact = false
}: {
  targetType: TargetType;
  targetId: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("SPAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, details: details || null })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setToast({ tone: "error", message: payload.error?.message ?? "Le signalement n’a pas pu être envoyé." });
      return;
    }
    setOpen(false);
    setDetails("");
    setToast({ tone: "success", message: "Signalement envoyé à la modération." });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? "inline-flex items-center gap-1 text-[11px] font-bold text-muted transition hover:text-coral"
          : "inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black text-muted transition hover:border-coral/60 hover:text-coral"
        }
        title={label}
      >
        <Flag size={compact ? 11 : 14} />
        {compact ? null : label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`report-${targetType}-${targetId}`} className="w-full rounded-t border border-line bg-panel shadow-2xl sm:max-w-lg sm:rounded">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-coral">Modération</div>
                <h2 id={`report-${targetType}-${targetId}`} className="mt-1 text-xl font-black text-paper">Signaler ce contenu</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded text-muted hover:text-paper" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4 p-5">
              <label className="block text-xs font-black text-muted">
                Motif
                <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-coral">
                  {reasons.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black text-muted">
                Précisions facultatives
                <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1200} className="mt-2 min-h-28 w-full resize-y rounded border border-line bg-ink p-3 text-paper outline-none focus:border-coral" placeholder="Explique brièvement le problème…" />
              </label>
              <p className="text-xs leading-5 text-muted">Le signalement est confidentiel. La personne concernée ne verra pas ton identité.</p>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 text-sm font-bold text-muted">Annuler</button>
                <button disabled={busy} className="rounded bg-coral px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? "Envoi…" : "Envoyer"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
