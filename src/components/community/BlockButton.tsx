"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

export function BlockButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function block() {
    setBusy(true);
    const response = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const payload = await response.json();
    if (!response.ok) {
      setBusy(false);
      setToast({ tone: "error", message: payload.error?.message ?? "Le blocage a échoué." });
      return;
    }
    setToast({ tone: "success", message: `${userName} a été bloqué.` });
    router.push("/commu");
    router.refresh();
  }

  return (
    <>
      {confirming ? (
        <div className="flex items-center gap-2 rounded border border-coral/40 bg-coral/8 p-2">
          <span className="text-xs font-bold text-muted">Confirmer ?</span>
          <button type="button" disabled={busy} onClick={block} className="rounded bg-coral px-3 py-1.5 text-xs font-black text-white">Bloquer</button>
          <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1.5 text-xs font-bold text-muted">Annuler</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black text-muted transition hover:border-coral/60 hover:text-coral">
          <Ban size={14} /> Bloquer
        </button>
      )}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
