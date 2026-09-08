import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/AuthShell";
import { SignUpForm } from "@/components/admin/SignUpForm";
import { availableProviders } from "@/lib/social-providers";

export const metadata: Metadata = {
  title: "Crear cuenta · Panel",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell title="Crear cuenta" subtitle="Empieza en un minuto">
      <SignUpForm providers={availableProviders()} />
    </AuthShell>
  );
}
