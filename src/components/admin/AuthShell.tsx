import type { ReactNode } from "react";
import { MailOpen } from "lucide-react";

/**
 * Marco común de las pantallas sin sesión: acceso, alta, recuperación y
 * restablecimiento. Lleva `data-panel` porque estas pantallas son del panel,
 * no de ninguna invitación: nunca deben adoptar el tema de un evento.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main
      data-panel
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 70% at 50% 0%, var(--color-cream-200) 0%, var(--color-cream-100) 45%, var(--color-cream-50) 100%)",
        }}
      />

      <section className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MailOpen className="size-5 text-olive-600" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl font-light tracking-wide text-forest-800">
            {title}
          </h1>
          <p className="mt-2 font-sans text-xs uppercase tracking-[0.24em] text-ink-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-3xl border border-cream-200 bg-cream-50/90 p-7 shadow-[0_20px_60px_-30px_rgba(20,25,34,0.45)] backdrop-blur">
          {children}
        </div>
      </section>
    </main>
  );
}
