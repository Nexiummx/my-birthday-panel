import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/AuthShell";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña · Panel",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar acceso" subtitle="Te enviamos un enlace">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
