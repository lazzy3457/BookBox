import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: true } };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
