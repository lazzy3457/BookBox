"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LegalNoticeActions({ id, initialStatus, initialDecision }: { id: string; initialStatus: string; initialDecision: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [decisionReason, setDecisionReason] = useState(initialDecision ?? "");
  const [message, setMessage] = useState("");
  async function save() {
    const response = await fetch(`/api/admin/legal-notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, decisionReason: decisionReason || null })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Décision enregistrée." : payload.error?.message ?? "Échec.");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[150px_1fr_auto]">
      <select aria-label="Statut" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded border border-line bg-ink px-3 text-xs text-paper">
        <option value="OPEN">Ouvert</option><option value="REVIEWING">En cours</option><option value="RESOLVED">Résolu</option><option value="DISMISSED">Rejeté</option>
      </select>
      <input aria-label="Motivation" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} maxLength={2000} placeholder="Motivation communiquée au déclarant…" className="h-10 rounded border border-line bg-ink px-3 text-xs text-paper" />
      <button type="button" onClick={save} className="rounded bg-mint px-4 text-xs font-black text-ink">Décider</button>
      {message ? <p role="status" className="text-xs text-muted sm:col-span-3">{message}</p> : null}
    </div>
  );
}
