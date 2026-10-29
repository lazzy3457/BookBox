"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Send } from "lucide-react";
import { useState } from "react";
import { legalConfig } from "@/lib/legal";
import { AuthField, AuthShell } from "@/components/auth/AuthShell";

type AuthFormProps = {
  mode: "login" | "signup";
};

// N'accepte que des chemins internes pour éviter toute redirection ouverte.
function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resent, setResent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    if (mode === "signup") {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name")),
          username: String(formData.get("username")),
          email,
          password,
          ageConfirmed: formData.get("ageConfirmed") === "on",
          termsAccepted: formData.get("termsAccepted") === "on",
          termsVersion: legalConfig.termsVersion,
          privacyVersion: legalConfig.privacyVersion
        })
      });

      setIsSubmitting(false);
      if (!response.ok) {
        setMessage("Ton compte n’a pas pu être créé. Vérifie les champs et réessaie.");
        return;
      }
      setVerificationEmail(email);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setMessage("E-mail ou mot de passe incorrect.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Connexion réussie. Ouverture de ton compte…");
    window.location.assign(safeCallback(searchParams.get("callbackUrl")));
  }

  async function resend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verificationEmail })
    });
    setResent(true);
  }

  if (verificationEmail) {
    return (
      <AuthShell panelTitle="Plus qu'une étape avant ta première étagère.">
        <div className="flex flex-col gap-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-panelSoft text-mint"><Send size={22} aria-hidden /></span>
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight text-paper sm:text-[34px]">Vérifie ta boîte mail</h1>
            <p className="mt-2 text-sm text-muted">On a envoyé un lien de confirmation à {verificationEmail}. Clique dessus pour activer ton compte.</p>
          </div>
          <div className="rounded-xl bg-ink p-4">
            <p className="text-[13px] font-extrabold text-paper">Rien reçu ?</p>
            <p className="mt-1 text-xs text-muted">Regarde dans les spams. Le lien est valable 24 heures.</p>
          </div>
          <button type="button" onClick={() => void resend()} disabled={resent} className="bb-btn-soft w-full py-3 text-sm">
            {resent ? "Lien renvoyé" : "Renvoyer le lien"}
          </button>
          <p className="text-[13px] text-muted">
            Mauvaise adresse ?{" "}
            <button type="button" onClick={() => setVerificationEmail("")} className="font-extrabold text-mint hover:underline">Recommencer l&apos;inscription</button>
          </p>
        </div>
      </AuthShell>
    );
  }

  const passwordInput = (
    <div className="relative">
      <input
        required
        name="password"
        type={isPasswordVisible ? "text" : "password"}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={8}
        maxLength={120}
        className="bb-input h-12 pr-12"
        placeholder={mode === "signup" ? "Au moins 8 caractères" : "••••••••••"}
      />
      <button
        type="button"
        onClick={() => setIsPasswordVisible((current) => !current)}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition hover:text-mint"
        aria-label={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  return (
    <AuthShell panelTitle={mode === "signup" ? "Ton carnet de lecture, partagé avec d'autres lecteurs." : "Content de te revoir."}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="mb-2">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-paper sm:text-[34px]">{mode === "signup" ? "Créer un compte" : "Connexion"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "signup" ? "Commence ta bibliothèque sociale, c'est rapide." : "Retour à tes lectures."}</p>
        </div>

        {mode === "signup" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="Nom">
              <input required name="name" autoComplete="name" placeholder="Camille Martin" className="bb-input h-12" />
            </AuthField>
            <AuthField label="Pseudo" hint="3 à 32 caractères : lettres, chiffres ou _">
              <input required name="username" autoComplete="username" minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]+" placeholder="camille" className="bb-input h-12" />
            </AuthField>
          </div>
        ) : null}

        <AuthField label="Adresse e-mail">
          <input required name="email" type="email" autoComplete="email" placeholder="camille@exemple.fr" className="bb-input h-12" />
        </AuthField>

        <AuthField
          label="Mot de passe"
          hint={mode === "signup" ? "Au moins 8 caractères." : undefined}
          aside={mode === "login" ? <Link href="/forgot-password" className="text-xs font-bold text-mint hover:underline">Mot de passe oublié ?</Link> : undefined}
        >
          {passwordInput}
        </AuthField>

        {mode === "signup" ? (
          <div className="flex flex-col gap-3 text-[13px] text-muted">
            <label className="flex items-start gap-3">
              <input required name="ageConfirmed" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--c-mint))]" />
              <span>Je confirme avoir au moins {legalConfig.minimumAge} ans.</span>
            </label>
            <label className="flex items-start gap-3">
              <input required name="termsAccepted" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--c-mint))]" />
              <span>
                J’accepte les <Link href="/conditions-utilisation" target="_blank" rel="noreferrer" className="font-extrabold text-mint">conditions d’utilisation</Link> et j’ai lu la{" "}
                <Link href="/confidentialite" target="_blank" rel="noreferrer" className="font-extrabold text-mint">politique de confidentialité</Link>.
              </span>
            </label>
          </div>
        ) : null}

        <button disabled={isSubmitting} className="bb-btn-primary w-full py-3.5 text-sm">
          {isSubmitting ? (mode === "signup" ? "Création…" : "Connexion…") : mode === "signup" ? "Créer mon compte" : "Se connecter"}
        </button>

        {message ? <p role="status" aria-live="polite" className={`text-sm ${message.startsWith("Connexion réussie") ? "text-mint" : "text-coral"}`}>{message}</p> : null}

        <p className={`text-[13px] text-muted ${mode === "login" ? "border-t border-line pt-5" : ""}`}>
          {mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <Link href={mode === "signup" ? "/login" : "/signup"} className="font-extrabold text-mint hover:underline">
            {mode === "signup" ? "Se connecter" : "Créer un compte"}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
