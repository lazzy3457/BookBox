"use client";

import { useState } from "react";

type StatusResult = {
  trackingCode: string;
  status: string;
  decisionReason: string | null;
  action: string;
};

export function LegalNoticeWorkspace() {
  const [message, setMessage] = useState("");
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);

  async function submitNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/legal-notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, goodFaith: data.goodFaith === "on" })
    });
    const payload = await response.json();
    setMessage(response.ok ? `Signalement reçu. Ton code de suivi est ${payload.trackingCode}.` : payload.error?.message ?? "Envoi impossible.");
    if (response.ok) form.reset();
  }

  async function checkStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/legal-notices/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    setStatusResult(payload.notice ?? null);
    setMessage(payload.notice ? "" : "Aucun dossier ne correspond à ces informations.");
  }

  async function appeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/legal-notices/appeal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setMessage(response.ok ? "Ta contestation a été transmise." : "La contestation n’a pas pu être transmise.");
    if (response.ok) event.currentTarget.reset();
  }

  const inputClass = "mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-mint";
  const areaClass = "mt-2 min-h-28 w-full rounded border border-line bg-ink p-3 text-paper outline-none focus:border-mint";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <form onSubmit={submitNotice} className="rounded border border-line bg-panel/80 p-6 shadow-poster">
        <h2 className="text-xl font-black text-paper">Notifier un contenu potentiellement illicite</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Fournis des éléments précis afin que la notification puisse être examinée rapidement.</p>
        <label className="mt-5 block text-xs font-black text-muted">Ton adresse e-mail<input required name="email" type="email" autoComplete="email" className={inputClass} /></label>
        <label className="mt-4 block text-xs font-black text-muted">Adresse exacte du contenu<input required name="targetUrl" type="url" placeholder="https://…" className={inputClass} /></label>
        <label className="mt-4 block text-xs font-black text-muted">Nature de l’illégalité présumée<input required name="legalGround" maxLength={200} placeholder="Ex. atteinte à la vie privée" className={inputClass} /></label>
        <label className="mt-4 block text-xs font-black text-muted">Explication détaillée<textarea required name="explanation" minLength={20} maxLength={4000} className={areaClass} /></label>
        <label className="hidden" aria-hidden="true">Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-muted"><input required name="goodFaith" type="checkbox" className="mt-1 h-4 w-4 accent-mint" /><span>Je confirme de bonne foi que les informations fournies sont exactes et complètes.</span></label>
        <button className="mt-5 rounded bg-mint px-5 py-3 text-sm font-black text-ink">Envoyer la notification</button>
      </form>

      <div className="space-y-6">
        <form onSubmit={checkStatus} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <h2 className="font-black text-paper">Suivre un dossier</h2>
          <label className="mt-4 block text-xs font-black text-muted">Code de suivi<input required name="trackingCode" className={inputClass} /></label>
          <label className="mt-3 block text-xs font-black text-muted">Adresse e-mail<input required name="email" type="email" className={inputClass} /></label>
          <button className="mt-4 text-sm font-black text-mint">Consulter le statut</button>
          {statusResult ? <div className="mt-4 rounded border border-line bg-ink/50 p-3 text-sm text-muted"><strong className="text-paper">{statusResult.status}</strong>{statusResult.decisionReason ? <p className="mt-2">{statusResult.decisionReason}</p> : null}</div> : null}
        </form>

        <form onSubmit={appeal} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <h2 className="font-black text-paper">Contester une décision</h2>
          <label className="mt-4 block text-xs font-black text-muted">Code de suivi<input required name="trackingCode" className={inputClass} /></label>
          <label className="mt-3 block text-xs font-black text-muted">Adresse e-mail<input required name="email" type="email" className={inputClass} /></label>
          <label className="mt-3 block text-xs font-black text-muted">Motif<textarea required name="reason" minLength={20} maxLength={3000} className={areaClass} /></label>
          <button className="mt-4 text-sm font-black text-mint">Envoyer la contestation</button>
        </form>
      </div>
      {message ? <p role="status" aria-live="polite" className="lg:col-span-2 rounded border border-line bg-panel p-4 text-sm text-paper">{message}</p> : null}
    </div>
  );
}
