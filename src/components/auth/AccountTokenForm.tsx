"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  return <AuthMessage title="Vérification de l’adresse" message={state} />;
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
    <form onSubmit={submit} className="mx-auto mt-12 max-w-md rounded border border-line bg-panel p-7 shadow-poster">
      <h1 className="text-2xl font-black text-paper">Mot de passe oublié</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{sent ? "Si un compte correspond à cette adresse, un lien vient d’être envoyé." : "Reçois un lien valable pendant 30 minutes."}</p>
      {!sent ? <><label className="mt-5 block text-xs font-black text-muted">Adresse e-mail<input required name="email" type="email" autoComplete="email" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-mint" /></label><button className="mt-5 w-full rounded bg-mint px-4 py-3 font-black text-ink">Envoyer le lien</button></> : null}
    </form>
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
  if (message) return <AuthMessage title="Nouveau mot de passe" message={message} />;
  return (
    <form onSubmit={submit} className="mx-auto mt-12 max-w-md rounded border border-line bg-panel p-7 shadow-poster">
      <h1 className="text-2xl font-black text-paper">Nouveau mot de passe</h1>
      <label className="mt-5 block text-xs font-black text-muted">Mot de passe<input required name="password" type="password" minLength={8} maxLength={120} autoComplete="new-password" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-paper outline-none focus:border-mint" /></label>
      <button className="mt-5 w-full rounded bg-mint px-4 py-3 font-black text-ink">Modifier le mot de passe</button>
    </form>
  );
}

function AuthMessage({ title, message }: { title: string; message: string }) {
  return <div role="status" className="mx-auto mt-12 max-w-md rounded border border-line bg-panel p-7 text-center shadow-poster"><h1 className="text-2xl font-black text-paper">{title}</h1><p className="mt-3 text-sm leading-6 text-muted">{message}</p><Link href="/login" className="mt-6 inline-block font-black text-mint">Aller à la connexion</Link></div>;
}
