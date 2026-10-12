"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";
import type { ModerationAction, ReportStatus, ReportTargetType } from "@/server/validation/moderation";

export function ModerationReportActions(props: {
  reportId: string;
  targetType: ReportTargetType;
  initialStatus: ReportStatus;
  initialNote: string | null;
  initialDecision: string | null;
  initialAction: ModerationAction;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(props.initialStatus);
  const [note, setNote] = useState(props.initialNote ?? "");
  const [decisionReason, setDecisionReason] = useState(props.initialDecision ?? "");
  const [action, setAction] = useState<ModerationAction>(props.initialAction);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function save() {
    setBusy(true);
    const response = await fetch(`/api/admin/reports/${props.reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, moderatorNote: note || null, decisionReason: decisionReason || null, action })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setToast({ tone: "error", message: payload.error?.message ?? "La décision n’a pas pu être enregistrée." });
      return;
    }
    setToast({ tone: "success", message: "Décision enregistrée et tracée." });
    router.refresh();
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select aria-label="Statut du signalement" value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)} className="h-10 rounded border border-line bg-ink px-3 text-xs font-bold text-paper">
        <option value="OPEN">Ouvert</option><option value="REVIEWING">En cours</option><option value="RESOLVED">Résolu</option><option value="DISMISSED">Rejeté</option>
      </select>
      <select aria-label="Action de modération" value={action} onChange={(event) => setAction(event.target.value as ModerationAction)} className="h-10 rounded border border-line bg-ink px-3 text-xs font-bold text-paper">
        <option value="NONE">Aucune action</option>
        {props.targetType === "USER" ? <><option value="SUSPEND">Suspendre le profil</option><option value="UNSUSPEND">Réactiver le profil</option></> : <><option value="HIDE">Masquer le contenu</option><option value="RESTORE">Restaurer le contenu</option></>}
      </select>
      <input aria-label="Motivation communiquée" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} maxLength={2000} placeholder="Motivation communiquée aux parties…" className="h-10 rounded border border-line bg-ink px-3 text-xs text-paper outline-none focus:border-mint sm:col-span-2" />
      <input aria-label="Note interne" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1200} placeholder="Note interne…" className="h-10 rounded border border-line bg-ink px-3 text-xs text-paper outline-none focus:border-mint" />
      <button type="button" disabled={busy} onClick={save} className="rounded bg-mint px-4 py-2 text-xs font-black text-ink disabled:opacity-50">Enregistrer la décision</button>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
