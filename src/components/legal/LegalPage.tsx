import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Datos del responsable, en un solo sitio para que actualizarlos no obligue a
 * buscarlos por las dos páginas.
 *
 * PENDIENTE: sustituir por los datos reales antes de publicar. Google exige un
 * aviso de privacidad accesible para verificar la app de OAuth, y uno con
 * marcadores de posición no pasa esa revisión.
 */
export const RESPONSABLE = {
  nombre: "Nexium",
  correo: "hola@nexiummx.com",
  domicilio: "[PENDIENTE: domicilio]",
  sitio: "nexiummx.com",
};

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main data-panel className="min-h-dvh bg-cream-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-sm text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Link>

        <h1 className="mt-8 font-serif text-3xl font-light text-forest-800 sm:text-4xl">{title}</h1>
        <p className="mt-2 font-sans text-xs uppercase tracking-[0.18em] text-ink-500">
          Última actualización: {updated}
        </p>

        <div className="mt-10 flex flex-col gap-7">{children}</div>
      </div>
    </main>
  );
}

/** Sección con encabezado. El estilo vive aquí para no repetirlo en cada una. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-serif text-xl text-ink-900">{title}</h2>
      <div className="flex flex-col gap-2.5 font-sans text-sm leading-relaxed text-ink-700">
        {children}
      </div>
    </section>
  );
}
