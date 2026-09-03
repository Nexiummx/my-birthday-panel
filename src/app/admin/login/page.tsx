import { Suspense } from "react";
import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { LoadingState } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "Acceso · Panel",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 70% at 50% 0%, #e9e0cb 0%, #f8f1e2 45%, #fdfaf3 100%)",
        }}
      />

      <section className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Leaf className="size-5 text-olive-600" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl font-light tracking-wide text-forest-800">
            Bosque Encantado
          </h1>
          <p className="mt-2 font-sans text-xs uppercase tracking-[0.24em] text-ink-500">
            Panel administrativo
          </p>
        </div>

        <div className="rounded-3xl border border-cream-200 bg-cream-50/90 p-7 shadow-[0_20px_60px_-30px_rgba(42,44,34,0.6)] backdrop-blur">
          <Suspense fallback={<LoadingState label="Preparando el acceso…" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
