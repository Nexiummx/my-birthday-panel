import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/AuthShell";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";
import { LoadingState } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "Nueva contraseña · Panel",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña" subtitle="Último paso">
      <Suspense fallback={<LoadingState label="Comprobando el enlace…" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
