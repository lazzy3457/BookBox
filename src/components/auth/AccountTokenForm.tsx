"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, MailCheck } from "lucide-react";
import { AuthField, AuthShell } from "@/components/auth/AuthShell";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState("Vérification en cours…");
  useEffect(() => {
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    }).then(async (response) => {
      const payload = await response.json();
      setState(response.ok ? "Ton adresse est vérifiée. Tu peux maintenant te connecter." : payload.error?.message ?? "Vérification impossible.");
    });
  }, [token]);
  return <AuthMessage title="Vérification de l’adresse" message={state} panelTitle="Plus qu'une étape avant ta première étagère." />;
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setSent(true);
  }
  return (
    <AuthShell panelTitle="Pas de panique, ça arrive à tout le monde.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Link href="/login" className="inline-flex w-fit items-center gap-1 text-xs font-extrabold text-mint hover:underline">
          <ChevronLeft size={14} aria-hidden />
          Retour à la connexion
        </Link>
        <div>
          <h1 className="font-display text-[34px] font-semibold leading-tight text-paper">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted">
            {sent ? "Si un compte correspond à cette adresse, un lien vient d’être envoyé." : "Indique ton adresse e-mail, on t’envoie un lien pour en choisir un nouveau."}
          </p>
        </div>
        {!sent ? (
          <>
            <AuthField label="Adresse e-mail">
              <input required name="email" type="email" autoComplete="email" placeholder="camille@exemple.fr" className="bb-input h-12" />
            </AuthField>
            <button className="bb-btn-primary w-full py-3.5 text-sm">Recevoir le lien</button>
            <p className="text-[11px] text-muted">Le lien est valable 30 minutes.</p>
          </>
        ) : null}
      </form>
    </AuthShell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const payload = await response.json();
    setMessage(response.ok ? "Ton mot de passe a été modifié." : payload.error?.message ?? "Réinitialisation impossible.");
  }
  if (message) return <AuthMessage title="Nouveau mot de passe" message={message} panelTitle="Content de te revoir." />;
  return (
    <AuthShell panelTitle="Un nouveau départ pour tes lectures.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h1 className="font-display text-[34px] font-semibold leading-tight text-paper">Nouveau mot de passe</h1>
        <AuthField label="Mot de passe" hint="Au moins 8 caractères.">
          <input required name="password" type="password" minLength={8} maxLength={120} autoComplete="new-password" className="bb-input h-12" />
        </AuthField>
        <button className="bb-btn-primary w-full py-3.5 text-sm">Modifier le mot de passe</button>
      </form>
    </AuthShell>
  );
}

function AuthMessage({ title, message, panelTitle }: { title: string; message: string; panelTitle: string }) {
  return (
    <AuthShell panelTitle={panelTitle}>
      <div role="status" className="flex flex-col gap-5">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-panelSoft text-mint"><MailCheck size={22} aria-hidden /></span>
        <h1 className="font-display text-[34px] font-semibold leading-tight text-paper">{title}</h1>
        <p className="text-sm text-muted">{message}</p>
        <Link href="/login" className="bb-btn-primary w-full py-3.5 text-sm">Aller à la connexion</Link>
      </div>
    </AuthShell>
  );
}
