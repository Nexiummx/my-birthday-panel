import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/AuthShell";
import { LoginForm } from "@/components/admin/LoginForm";
import { LoadingState } from "@/components/ui/States";
import { availableProviders } from "@/lib/social-providers";

export const metadata: Metadata = {
  title: "Acceso · Panel",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell title="Invitaciones" subtitle="Panel administrativo">
      <Suspense fallback={<LoadingState label="Preparando el acceso…" />}>
        <LoginForm providers={availableProviders()} />
      </Suspense>
    </AuthShell>
  );
}
