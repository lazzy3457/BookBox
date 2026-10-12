import { VerifyEmailForm } from "@/components/auth/AccountTokenForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vérification de l’adresse", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <VerifyEmailForm token={token} />;
}
