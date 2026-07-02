import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: true } };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
