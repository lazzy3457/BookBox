import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { isGoogleAuthEnabled } from "@/server/auth/google";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: true } };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={isGoogleAuthEnabled()} />
    </Suspense>
  );
}
