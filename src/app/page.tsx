import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, LockKeyhole, MailOpen, Palette } from "lucide-react";
import { PlanCards } from "@/components/pricing/PlanCards";
import { CONTACT_LABEL, FEATURED_PLAN, contactHref, formatPrice } from "@/lib/pricing";
import { THEME_LIST } from "@/lib/themes";

/**
 * Portada pública del producto.
 *
 * No consulta la base a propósito. La versión anterior enlazaba la primera
 * invitación que encontrara, con el nombre del invitado incluido: como el
 * "secreto" de una invitación es su slug, eso permitía a cualquiera abrirla y
 * confirmar asistencia en nombre de esa persona.
 */
export const metadata: Metadata = {
  title: "Invitaciones digitales · Una experiencia por invitado",
  description:
    "Invitaciones con enlace propio para cada invitado, apertura animada y confirmación de asistencia en tiempo real.",
};

const FEATURES = [
  {
    icon: MailOpen,
    title: "Un enlace por invitado",
    body: "Cada persona recibe su propia invitación, con su nombre y sus pases. Nada de una imagen genérica reenviada en grupo.",
  },
  {
    icon: Palette,
    title: "Cuatro estéticas",
    body: "Elige el tema y la invitación cambia entera: colores, tipografías, escena y textos. No es un filtro de color.",
  },
  {
    icon: CalendarCheck,
    title: "Confirmaciones en vivo",
    body: "Ves quién confirmó, cuántas personas trae y qué te escribió, sin perseguir a nadie por WhatsApp.",
  },
];

export default function HomePage() {
  return (
    <main data-panel className="min-h-dvh bg-cream-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-6 py-16 sm:py-24">
        <header className="flex flex-col items-center text-center">
          <MailOpen className="size-6 text-olive-600" aria-hidden="true" />
          <p className="mt-5 font-sans text-[11px] uppercase tracking-[0.28em] text-ink-500">
            Invitaciones digitales
          </p>
          <h1 className="mt-4 max-w-[18ch] text-balance font-serif text-4xl font-light leading-tight text-forest-800 sm:text-5xl">
            Una invitación distinta para cada invitado
          </h1>
          <p className="mt-5 max-w-lg font-sans text-base leading-relaxed text-ink-700">
            Un enlace propio con su nombre, una apertura animada y la confirmación de
            asistencia resuelta en el mismo sitio. Desde {formatPrice(FEATURED_PLAN.price)} MXN
            por evento.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/admin/registro"
              className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-7 py-3.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
            >
              Crear cuenta
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-7 py-3.5 font-sans text-sm text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-900"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
              Ya tengo cuenta
            </Link>
          </div>
        </header>

        <section aria-labelledby="temas" className="flex flex-col gap-6">
          <div className="text-center">
            <h2 id="temas" className="font-serif text-2xl font-light text-forest-800">
              Cuatro temas
            </h2>
            <p className="mt-2 font-sans text-sm text-ink-500">
              Cada uno con su paleta, sus tipografías y su escena.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {THEME_LIST.map((theme) => {
              const [background, accent, paper] = theme.swatch;
              return (
                <li
                  key={theme.id}
                  className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-50"
                >
                  {/* La muestra usa los colores reales del tema: es la forma
                      más honesta de enseñarlos sin renderizar la escena. */}
                  <div aria-hidden="true" className="flex h-24">
                    <span className="w-1/2" style={{ background }} />
                    <span className="flex w-1/2 flex-col">
                      <span className="h-1/2" style={{ background: accent }} />
                      <span className="h-1/2" style={{ background: paper }} />
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg text-ink-900">{theme.label}</h3>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-ink-500">
                      {theme.tagline}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Qué incluye" className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex flex-col gap-2">
                <Icon className="size-5 text-olive-600" aria-hidden="true" />
                <h3 className="font-serif text-lg text-ink-900">{feature.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-ink-500">{feature.body}</p>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="precios" className="flex flex-col gap-6">
          <div className="text-center">
            <h2 id="precios" className="font-serif text-2xl font-light text-forest-800">
              Precios
            </h2>
            <p className="mt-2 font-sans text-sm text-ink-500">
              Se paga por evento, no por invitado: invitar a 300 personas cuesta lo mismo que
              invitar a 40.
            </p>
          </div>

          <PlanCards />

          <p className="text-center font-sans text-sm text-ink-500">
            Creas tu cuenta gratis y la activamos por {CONTACT_LABEL} cuando quede el pago.{" "}
            <a
              href={contactHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-cream-300 underline-offset-4 transition-colors hover:text-ink-900"
            >
              ¿Dudas? Escríbenos
            </a>
            .
          </p>
        </section>

        <footer className="flex flex-col items-center gap-3 border-t border-cream-300 pt-8 text-center">
          <p className="font-sans text-xs text-ink-500">
            <Link href="/privacidad" className="underline underline-offset-4 hover:text-ink-900">
              Aviso de privacidad
            </Link>
            {" · "}
            <Link href="/terminos" className="underline underline-offset-4 hover:text-ink-900">
              Términos
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
