"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          password
        })
      });

      if (!response.ok) {
        setMessage("Ton compte n'a pas pu etre cree. Verifie les champs et reessaie.");
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setMessage("Email ou mot de passe incorrect.");
      return;
    }

    router.push("/");
    router.refresh();
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
          <input name="name" className="mt-6 h-11 w-full rounded border border-line bg-ink px-3 outline-none focus:border-mint" placeholder="Nom" />
          <input name="username" className="mt-3 h-11 w-full rounded border border-line bg-ink px-3 outline-none focus:border-mint" placeholder="Pseudo" />
        </>
      ) : null}

      <input name="email" type="email" className="mt-3 h-11 w-full rounded border border-line bg-ink px-3 outline-none focus:border-mint" placeholder="Email" />
      <div className="relative mt-3">
        <input
          name="password"
          type={isPasswordVisible ? "text" : "password"}
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

      <button className="mt-5 w-full rounded bg-mint px-4 py-3 font-black text-ink transition hover:bg-lime">
        {mode === "signup" ? "S'inscrire" : "Se connecter"}
      </button>

      {message ? <p className="mt-4 text-sm text-coral">{message}</p> : null}

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
