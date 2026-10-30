"use client";

import { CheckCircle2, Download, Trash2, X } from "lucide-react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

type Props = {
  hasPassword: boolean;
  email: string | null;
  googleAvailable: boolean;
  googleConfirmed: boolean;
  reopenDeletion: boolean;
};

export function AccountDataControls({ hasPassword, email, googleAvailable, googleConfirmed, reopenDeletion }: Props) {
  const [deletionOpen, setDeletionOpen] = useState(reopenDeletion);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  // Sans mot de passe, la suppression attend une connexion Google de moins de 5 minutes.
  const [needsGoogle, setNeedsGoogle] = useState(!hasPassword && !googleConfirmed);
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
        body: JSON.stringify(hasPassword ? { password, confirmation } : { confirmation })
      });
      const payload = await response.json();
      if (payload.error?.code === "REAUTH_REQUIRED") setNeedsGoogle(true);
      if (!response.ok) throw new Error(payload.error?.message ?? "La suppression a échoué.");
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "La suppression a échoué." });
      setBusy(false);
    }
  }

  function confirmWithGoogle() {
    setBusy(true);
    void signIn(
      "google",
      { callbackUrl: "/settings?rubrique=donnees&suppression=google" },
      { prompt: "select_account", ...(email ? { login_hint: email } : {}) }
    );
  }

  return (
    <>
      <section className="mt-7 rounded border border-line bg-panel/80 p-5 shadow-poster">
        <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-mint">Compte et données</div>
        <h2 className="mt-1 text-xl font-extrabold text-paper">Contrôler mes données</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Télécharge une copie de tes informations ou supprime définitivement ton compte et son contenu.
        </p>
        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={downloadExport}
            className="inline-flex items-center justify-center gap-2 rounded border border-line px-4 py-3 text-sm font-extrabold text-paper transition hover:border-mint hover:text-mint disabled:opacity-50"
          >
            <Download size={16} /> Télécharger mes données
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeletionOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded border border-coral/45 px-4 py-3 text-sm font-extrabold text-coral transition hover:border-coral hover:bg-coral/10 disabled:opacity-50"
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
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Zone dangereuse</div>
                <h3 id="delete-account-title" className="mt-1 text-xl font-extrabold text-paper">Supprimer définitivement le compte</h3>
              </div>
              <button type="button" onClick={() => setDeletionOpen(false)} className="grid h-9 w-9 place-items-center rounded text-muted hover:text-paper" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={deleteAccount} className="space-y-4 p-5">
              <p className="text-sm leading-6 text-muted">
                Bibliothèque, journal, reviews, commentaires, listes et relations sociales seront supprimés. Cette action est irréversible.
              </p>
              {hasPassword ? (
                <label className="block text-xs font-extrabold text-muted">
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
              ) : !needsGoogle ? (
                <p className="flex items-start gap-2 rounded border border-mint/40 p-3 text-sm leading-6 text-paper">
                  <CheckCircle2 size={16} aria-hidden className="mt-1 shrink-0 text-mint" />
                  Identité confirmée avec Google. Valide la suppression dans les 5 minutes qui suivent ta connexion.
                </p>
              ) : googleAvailable ? (
                <div className="space-y-3 rounded border border-line p-3">
                  <p className="text-sm leading-6 text-muted">
                    Ton compte n’a pas de mot de passe. Pour confirmer que c’est bien toi, reconnecte-toi avec Google : tu reviendras ici et auras 5 minutes pour valider.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirmWithGoogle}
                    className="rounded border border-line px-4 py-2.5 text-sm font-extrabold text-paper transition hover:border-mint hover:text-mint disabled:opacity-50"
                  >
                    Confirmer avec Google
                  </button>
                </div>
              ) : (
                <p className="rounded border border-line p-3 text-sm leading-6 text-muted">
                  Ton compte n’a pas de mot de passe et la connexion Google est indisponible. Définis d’abord un mot de passe dans{" "}
                  <Link href="/settings?rubrique=securite" className="font-extrabold text-paper underline">Connexion &amp; sécurité</Link>, puis reviens ici.
                </p>
              )}
              <label className="block text-xs font-extrabold text-muted">
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
                  disabled={busy || confirmation !== "SUPPRIMER MON COMPTE" || (hasPassword ? !password : needsGoogle)}
                  className="rounded-full bg-coral px-5 py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
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
