"use client";

import { Download, Trash2, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

export function AccountDataControls() {
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function downloadExport() {
    setBusy(true);
    setToast(null);
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      if (!response.ok) throw new Error("L’export n’a pas pu être préparé.");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "booksbox-export.json";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ tone: "success", message: "Ton export BooksBox a été téléchargé." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Export impossible." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "La suppression a échoué.");
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "La suppression a échoué." });
      setBusy(false);
    }
  }

  return (
    <>
      <section className="mt-7 rounded border border-line bg-panel/80 p-5 shadow-poster">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-mint">Compte et données</div>
        <h2 className="mt-1 text-xl font-black text-paper">Contrôler mes données</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Télécharge une copie de tes informations ou supprime définitivement ton compte et son contenu.
        </p>
        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={downloadExport}
            className="inline-flex items-center justify-center gap-2 rounded border border-line px-4 py-3 text-sm font-black text-paper transition hover:border-mint hover:text-mint disabled:opacity-50"
          >
            <Download size={16} /> Télécharger mes données
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeletionOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded border border-coral/45 px-4 py-3 text-sm font-black text-coral transition hover:border-coral hover:bg-coral/10 disabled:opacity-50"
          >
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        </div>
      </section>

      {deletionOpen ? (
        <div className="fixed inset-0 z-50 grid items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full rounded-t border border-coral/45 bg-panel shadow-2xl sm:max-w-lg sm:rounded">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-coral">Zone dangereuse</div>
                <h3 id="delete-account-title" className="mt-1 text-xl font-black text-paper">Supprimer définitivement le compte</h3>
              </div>
              <button type="button" onClick={() => setDeletionOpen(false)} className="grid h-9 w-9 place-items-center rounded text-muted hover:text-paper" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={deleteAccount} className="space-y-4 p-5">
              <p className="text-sm leading-6 text-muted">
                Bibliothèque, journal, reviews, commentaires, listes et relations sociales seront supprimés. Cette action est irréversible.
              </p>
              <label className="block text-xs font-black text-muted">
                Mot de passe actuel
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-coral"
                />
              </label>
              <label className="block text-xs font-black text-muted">
                Recopie SUPPRIMER MON COMPTE
                <input
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-coral"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setDeletionOpen(false)} className="rounded px-4 py-2 text-sm font-bold text-muted">Annuler</button>
                <button
                  disabled={busy || confirmation !== "SUPPRIMER MON COMPTE" || !password}
                  className="rounded bg-coral px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Suppression…" : "Supprimer définitivement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
