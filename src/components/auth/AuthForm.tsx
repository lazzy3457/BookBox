"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { legalConfig } from "@/lib/legal";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

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

      if (!response.ok) {
        setMessage("Ton compte n’a pas pu être créé. Vérifie les champs et réessaie.");
        setIsSubmitting(false);
        return;
      }
      setVerificationEmail(email);
      setMessage("Si l’adresse peut être utilisée, un lien de vérification vient d’être envoyé.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setMessage("Email ou mot de passe incorrect.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Connexion réussie. Ouverture de ton compte…");
    window.location.assign("/");
  }

  if (verificationEmail) {
    return (
      <div className="mx-auto mt-8 max-w-md rounded border border-line bg-panel p-7 text-center shadow-poster sm:mt-20">
        <h1 className="text-2xl font-black text-paper">Vérifie ta boîte mail</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <Link href="/login" className="mt-6 inline-block rounded bg-mint px-5 py-3 font-black text-ink">Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-md overflow-hidden rounded border border-line bg-panel shadow-poster sm:mt-20">
      <div className="h-1 bg-gradient-to-r from-mint via-sky to-coral" />
      <div className="p-5 sm:p-7">
      <h1 className="text-2xl font-black text-paper">{mode === "signup" ? "Créer un compte" : "Connexion"}</h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signup" ? "Commence ta bibliothèque sociale." : "Retour à tes lectures."}
      </p>

      {mode === "signup" ? (
        <>
          <label className="mt-6 block text-xs font-black text-muted">Nom
            <input required name="name" autoComplete="name" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 outline-none focus:border-mint" />
          </label>
          <label className="mt-3 block text-xs font-black text-muted">Pseudo
            <input required name="username" autoComplete="username" minLength={3} maxLength={32} className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 outline-none focus:border-mint" />
          </label>
        </>
      ) : null}

      <label className="mt-3 block text-xs font-black text-muted">Adresse e-mail
      <input required name="email" type="email" autoComplete="email" className="mt-2 h-11 w-full rounded border border-line bg-ink px-3 text-base text-paper outline-none focus:border-mint" />
      </label>
      <label className="mt-3 block text-xs font-black text-muted">Mot de passe
      <div className="relative mt-2">
        <input
          required
          name="password"
          type={isPasswordVisible ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          className="h-11 w-full rounded border border-line bg-ink px-3 pr-12 outline-none focus:border-mint"
          placeholder="Mot de passe"
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible((current) => !current)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition hover:text-mint"
          aria-label={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          title={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      </label>

      {mode === "signup" ? (
        <div className="mt-5 space-y-3 rounded border border-line bg-ink/45 p-4 text-xs leading-5 text-muted">
          <label className="flex items-start gap-3">
            <input required name="ageConfirmed" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-mint" />
            <span>Je confirme avoir au moins {legalConfig.minimumAge} ans.</span>
          </label>
          <label className="flex items-start gap-3">
            <input required name="termsAccepted" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-mint" />
            <span>
              J’accepte les <Link href="/conditions-utilisation" target="_blank" rel="noreferrer" className="font-bold text-mint">conditions d’utilisation</Link>{" "}
              et reconnais avoir lu la <Link href="/confidentialite" target="_blank" rel="noreferrer" className="font-bold text-mint">politique de confidentialité</Link>.
            </span>
          </label>
          <p>Ces données sont nécessaires pour créer et sécuriser ton compte. Tu peux ensuite les consulter, les exporter ou supprimer ton compte depuis les paramètres.</p>
        </div>
      ) : null}

      <button disabled={isSubmitting} className="mt-5 w-full rounded bg-mint px-4 py-3 font-black text-ink transition hover:bg-lime disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? "Connexion…" : mode === "signup" ? "S'inscrire" : "Se connecter"}
      </button>

      {message ? <p role="status" aria-live="polite" className={`mt-4 text-sm ${message.startsWith("Connexion réussie") ? "text-mint" : "text-coral"}`}>{message}</p> : null}

      {mode === "login" ? <Link href="/forgot-password" className="mt-4 block text-sm font-bold text-mint">Mot de passe oublié ?</Link> : null}

      <p className="mt-5 text-sm text-muted">
        {mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
        <Link href={mode === "signup" ? "/login" : "/signup"} className="font-bold text-mint">
          {mode === "signup" ? "Connexion" : "Inscription"}
        </Link>
      </p>
      </div>
    </form>
  );
}
