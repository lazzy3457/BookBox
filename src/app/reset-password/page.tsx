import { ResetPasswordForm } from "@/components/auth/AccountTokenForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <ResetPasswordForm token={token} />;
}
