import Link from "next/link";
import { ArrowRight, Leaf, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Portada mínima: no es parte del entregable para el invitado, solo un punto de
 * entrada para abrir una invitación de ejemplo o el panel.
 */
export default async function HomePage() {
  const invitation = await prisma.invitation
    .findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true, guestName: true } })
    .catch(() => null);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-forest-950 px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 75% at 50% 25%, #35502a 0%, #1a2a12 52%, #0b120a 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <Leaf className="size-6 text-gold-400" aria-hidden="true" />
        <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.42em] text-gold-300/80">
          Invitaciones digitales
        </p>
        <h1 className="mt-4 max-w-[14ch] font-serif text-4xl font-light leading-tight text-cream-100 sm:text-5xl">
          Bosque Encantado
        </h1>
        <p className="mt-5 max-w-md font-sans text-sm leading-relaxed text-cream-200/70">
          Cada invitado recibe un enlace propio con una apertura cinematográfica y su
          confirmación de asistencia.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          {invitation && (
            <Link
              href={`/i/${invitation.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 font-sans text-xs uppercase tracking-[0.18em] text-forest-900 transition-transform duration-300 hover:-translate-y-px hover:bg-gold-400"
            >
              Ver invitación de {invitation.guestName.split(" ")[0]}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-cream-200/25 px-7 py-3.5 font-sans text-xs uppercase tracking-[0.18em] text-cream-100 transition-colors hover:border-gold-400/60 hover:text-gold-300"
          >
            <LockKeyhole className="size-4" aria-hidden="true" />
            Panel administrativo
          </Link>
        </div>

        {!invitation && (
          <p className="mt-8 max-w-sm rounded-2xl border border-cream-200/15 px-5 py-4 font-sans text-xs text-cream-200/60">
            Todavía no hay invitaciones. Ejecuta <code className="text-gold-300">npm run db:seed</code>{" "}
            para crear el evento y las invitaciones de ejemplo.
          </p>
        )}
      </div>
    </main>
  );
}
