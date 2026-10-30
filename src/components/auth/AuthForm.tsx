"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Send } from "lucide-react";
import { useRef, useState } from "react";
import { AUTH_ERRORS, authErrorMessage } from "@/lib/authErrors";
import { legalConfig } from "@/lib/legal";
import { AuthField, AuthShell } from "@/components/auth/AuthShell";

type AuthFormProps = {
  mode: "login" | "signup";
  googleEnabled?: boolean;
};

// N'accepte que des chemins internes pour éviter toute redirection ouverte.
function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function AuthForm({ mode, googleEnabled = false }: AuthFormProps) {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  // Les erreurs de NextAuth (Google, liens expirés…) arrivent dans l'URL ; seuls des codes connus sont traduits.
  const [message, setMessage] = useState(() => {
    const error = searchParams.get("error");
    return error ? authErrorMessage(error) : "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resent, setResent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setUnverifiedEmail("");
    setResent(false);
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

    if (!result?.ok || result.error) {
      const error = result?.error ?? AUTH_ERRORS.SIGNIN_UNAVAILABLE;
      if (error === AUTH_ERRORS.EMAIL_NOT_VERIFIED) setUnverifiedEmail(email);
      setMessage(authErrorMessage(error));
      setIsSubmitting(false);
      return;
    }

    setMessage("Connexion réussie. Ouverture de ton compte…");
    window.location.assign(safeCallback(searchParams.get("callbackUrl")));
  }

  async function continueWithGoogle() {
    setMessage("");

    if (mode === "signup" && formRef.current) {
      const formData = new FormData(formRef.current);
      if (formData.get("ageConfirmed") !== "on" || formData.get("termsAccepted") !== "on") {
        setMessage("Coche les deux cases ci-dessus pour continuer avec Google.");
        return;
      }
      setIsSubmitting(true);
      const response = await fetch("/api/auth/google-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageConfirmed: true,
          termsAccepted: true,
          termsVersion: legalConfig.termsVersion,
          privacyVersion: legalConfig.privacyVersion
        })
      });
      if (!response.ok) {
        setMessage(authErrorMessage(AUTH_ERRORS.SIGNIN_UNAVAILABLE));
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    await signIn("google", { callbackUrl: safeCallback(searchParams.get("callbackUrl")) });
  }

  async function resend(email: string) {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
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
          <button type="button" onClick={() => void resend(verificationEmail)} disabled={resent} className="bb-btn-soft w-full py-3 text-sm">
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
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-5">
        <div className="mb-2">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-paper sm:text-[34px]">{mode === "signup" ? "Créer un compte" : "Connexion"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "signup" ? "Commence ta bibliothèque sociale, c'est rapide." : "Retour à tes lectures."}</p>
        </div>

        {mode === "signup" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {googleEnabled ? (
          <>
            <div aria-hidden className="flex items-center gap-3 text-[11px] font-bold uppercase text-muted">
              <span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" />
            </div>
            <button type="button" onClick={() => void continueWithGoogle()} disabled={isSubmitting} className="bb-btn-outline w-full py-3 text-sm">
              <GoogleLogo />
              Continuer avec Google
            </button>
          </>
        ) : null}

        {message ? <p role="status" aria-live="polite" className={`text-sm ${message.startsWith("Connexion réussie") ? "text-mint" : "text-coral"}`}>{message}</p> : null}

        {unverifiedEmail ? (
          <button type="button" onClick={() => void resend(unverifiedEmail)} disabled={resent} className="bb-btn-soft w-full py-3 text-sm">
            {resent ? "Lien renvoyé" : "Renvoyer le lien"}
          </button>
        ) : null}

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
