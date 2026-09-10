import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  Clapperboard,
  DoorOpen,
  LockKeyhole,
  MailOpen,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { InvitationPreview } from "@/components/marketing/InvitationPreview";
import { Wordmark } from "@/components/marketing/Wordmark";
import { PlanCards } from "@/components/pricing/PlanCards";
import { BRAND } from "@/lib/brand";
import { CONTACT_LABEL, FEATURED_PLAN, contactHref, formatPrice } from "@/lib/pricing";
import { THEME_LIST } from "@/lib/themes";

/**
 * Portada pública del producto.
 *
 * No consulta la base a propósito. Una versión anterior enlazaba la primera
 * invitación que encontrara, con el nombre del invitado incluido: como el
 * "secreto" de una invitación es su enlace, eso permitía a cualquiera abrirla y
 * confirmar asistencia en nombre de esa persona.
 *
 * El orden de las secciones sigue el orden en que se decide una compra de este
 * tipo: primero se ve la invitación (es lo que se compra), luego que es fácil,
 * luego lo que nadie más da —el recuerdo y el video—, y solo entonces el
 * precio. Poner el precio arriba lo convierte en la única comparación posible.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description:
    "Invitaciones digitales para XV años, bodas y cumpleaños: un enlace propio por invitado, confirmaciones en vivo, y el recuerdo de la fiesta en video.",
};

const PASOS = [
  {
    icon: MailOpen,
    title: "Eliges tu tema",
    body: "Cuatro estéticas completas. Cambias el tema y cambia todo: colores, tipografías, la escena del fondo y hasta los textos de la portada.",
  },
  {
    icon: Send,
    title: "Cargas tu lista",
    body: "Pegas los nombres desde Excel o WhatsApp y listo. Cada invitado recibe su enlace, con su nombre y sus pases, para mandar por WhatsApp de un toque.",
  },
  {
    icon: CalendarCheck,
    title: "Ves quién viene",
    body: "Confirmaciones y mensajes en vivo. Sabes a quién no le llegó, a quién le llegó y no ha contestado, y cuántos entraron el día de la fiesta.",
  },
];

const INCLUYE = [
  {
    icon: MailOpen,
    title: "Un enlace por invitado",
    body: "Con su nombre y sus pases. Nada de una imagen genérica reenviada en un grupo de cincuenta personas.",
  },
  {
    icon: MessageCircle,
    title: "Confirmaciones y recados",
    body: "Responden desde la misma invitación y te llega al instante, con el mensaje que quisieron dejarte.",
  },
  {
    icon: Send,
    title: "Envío por WhatsApp",
    body: "Escribes el mensaje una vez y sale con el nombre de cada quien. Ves quién abrió su invitación y quién no.",
  },
  {
    icon: DoorOpen,
    title: "Lista de entrada",
    body: "El día del evento marcas quién llegó desde el celular, aunque venga con más gente de la que confirmó.",
  },
  {
    icon: Camera,
    title: "Fotos y videos de todos",
    body: "Un código QR en las mesas y tus invitados suben lo que tomaron. Se ve al instante y tú decides qué se queda.",
  },
  {
    icon: Sparkles,
    title: "Sin instalar nada",
    body: "Ni tú ni tus invitados descargan una aplicación. Se abre en el navegador del teléfono y ya.",
  },
];

const PREGUNTAS = [
  {
    q: "¿Mis invitados tienen que descargar algo?",
    a: "No. Reciben un enlace por WhatsApp, lo abren y ya está. Funciona en cualquier teléfono con internet.",
  },
  {
    q: "¿Puedo cambiar la fecha si se recorre el evento?",
    a: "Sí, una vez, y siempre que la nueva fecha caiga en el mes anterior o el siguiente. Para un cambio mayor nos escribes desde el panel y lo hacemos nosotros.",
  },
  {
    q: "¿Cuántos invitados puedo tener?",
    a: "Los que quieras. Se paga por evento, no por invitado: invitar a 300 personas cuesta lo mismo que invitar a 40.",
  },
  {
    q: "¿Qué pasa con las fotos después de la fiesta?",
    a: "Se quedan en la galería del evento y arman el recuerdo. Puedes ocultar cualquiera sin borrarla, y descargar el video para publicarlo.",
  },
];

export default function HomePage() {
  return (
    <main data-panel className="min-h-dvh bg-cream-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-sm text-ink-700 transition-colors hover:text-ink-900"
          >
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Entrar
          </Link>
          <Link
            href="/admin/registro"
            className="rounded-full bg-olive-600 px-5 py-2.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-20 pt-8 sm:gap-28 sm:pb-28">
        {/* ── Portada ─────────────────────────────────────────────────── */}
        <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_auto]">
          <div className="text-center lg:text-left">
            <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-olive-600">
              XV años · Bodas · Cumpleaños
            </p>
            <h1 className="mt-5 max-w-[15ch] text-balance font-serif text-[2.6rem] font-light leading-[1.05] text-forest-800 sm:text-6xl lg:mx-0 mx-auto">
              Una invitación distinta para cada invitado
            </h1>
            <p className="mx-auto mt-6 max-w-lg font-sans text-base leading-relaxed text-ink-700 lg:mx-0">
              Se abre con su nombre, se ve como una pieza hecha para tu fiesta y confirma
              asistencia ahí mismo. Tú ves quién viene, quién falta y quién llegó — sin perseguir
              a nadie por WhatsApp.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center">
              <Link
                href="/admin/registro"
                className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-7 py-3.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
              >
                Crear mi invitación
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href="#precios"
                className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-7 py-3.5 font-sans text-sm text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-900"
              >
                Ver precios
              </a>
            </div>

            <p className="mt-5 font-sans text-xs text-ink-500">
              Desde {formatPrice(FEATURED_PLAN.price)} MXN por evento · Creas tu cuenta gratis y la
              ves antes de pagar
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <InvitationPreview />
          </div>
        </section>

        {/* ── Cómo funciona ───────────────────────────────────────────── */}
        <section aria-labelledby="pasos">
          <div className="text-center">
            <h2 id="pasos" className="font-serif text-3xl font-light text-forest-800">
              Tres pasos y está lista
            </h2>
            <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-ink-500">
              Sin diseñador, sin esperar aprobaciones y sin reimprimir nada cuando cambie un dato.
            </p>
          </div>

          {/* Numerados porque SÍ son una secuencia: no se puede mandar la lista
              antes de tener el tema, ni ver confirmaciones antes de mandarla. */}
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {PASOS.map((paso, index) => {
              const Icon = paso.icon;
              return (
                <li key={paso.title} className="flex flex-col gap-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full border border-gold-400/50 font-serif text-sm text-gold-600">
                      {index + 1}
                    </span>
                    <Icon className="size-4 text-olive-600" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-xl text-ink-900">{paso.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-ink-500">{paso.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Temas ───────────────────────────────────────────────────── */}
        <section aria-labelledby="temas" className="flex flex-col gap-8">
          <div className="text-center">
            <h2 id="temas" className="font-serif text-3xl font-light text-forest-800">
              Cuatro temas, cuatro mundos
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-sans text-sm text-ink-500">
              No es un filtro de color: cada tema trae su paleta, sus tipografías, su escena
              animada y sus textos. Elige el que se parezca a tu fiesta.
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
                  <div aria-hidden="true" className="flex h-28">
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

        {/* ── El recuerdo: lo que nadie más da ────────────────────────── */}
        <section
          aria-labelledby="recuerdo"
          className="grid items-center gap-12 rounded-3xl bg-forest-900 px-7 py-12 text-cream-100 sm:px-12 lg:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-gold-400">
              Después de la fiesta
            </p>
            <h2 id="recuerdo" className="mt-4 font-serif text-3xl font-light sm:text-4xl">
              La fiesta no se acaba cuando se apagan las luces
            </h2>
            <p className="mt-5 max-w-xl font-sans text-sm leading-relaxed text-cream-100/75">
              Tus invitados suben sus fotos y videos con un código QR en las mesas. Con todo eso
              armamos <strong className="font-medium text-cream-100">el recuerdo</strong>: un
              resumen en pantallas, estilo historias, que se comparte con un enlace.
            </p>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-cream-100/75">
              Y para publicar, un <strong className="font-medium text-cream-100">video vertical</strong>{" "}
              que se descarga listo para Instagram o TikTok, con tus mejores fotos, las cifras de
              la noche y la canción que tú elijas.
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-sans text-xs uppercase tracking-[0.14em] text-cream-100/60">
              <li className="flex items-center gap-2">
                <Camera className="size-3.5 text-gold-400" aria-hidden="true" />
                Galería compartida
              </li>
              <li className="flex items-center gap-2">
                <Clapperboard className="size-3.5 text-gold-400" aria-hidden="true" />
                Recuerdo en historias
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-gold-400" aria-hidden="true" />
                Video para redes
              </li>
            </ul>
          </div>

          {/* Tres cuadros del video, superpuestos como un carrete. */}
          <div aria-hidden="true" className="flex justify-center gap-3 lg:justify-end">
            {[
              { label: "Se juntaron", value: "128", unit: "personas", rotate: "-4deg" },
              { label: "Quedaron", value: "412", unit: "fotos", rotate: "2deg" },
              { label: "Y llegaron", value: "96", unit: "hasta el final", rotate: "6deg" },
            ].map((frame, index) => (
              <div
                key={frame.value}
                className="flex aspect-[9/16] w-[92px] flex-col items-center justify-center rounded-xl border border-cream-100/15 bg-forest-950 px-2 text-center shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] sm:w-[104px]"
                style={{ rotate: frame.rotate, marginTop: index === 1 ? "-1rem" : undefined }}
              >
                <span className="font-sans text-[7px] uppercase tracking-[0.2em] opacity-60">
                  {frame.label}
                </span>
                <span className="mt-2 font-display-script text-3xl leading-none text-gold-400">
                  {frame.value}
                </span>
                <span className="mt-1 font-serif text-[10px] opacity-85">{frame.unit}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Qué incluye ─────────────────────────────────────────────── */}
        <section aria-labelledby="incluye">
          <div className="text-center">
            <h2 id="incluye" className="font-serif text-3xl font-light text-forest-800">
              Todo lo que necesitas para el día
            </h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUYE.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex flex-col gap-2">
                  <Icon className="size-5 text-olive-600" aria-hidden="true" />
                  <h3 className="font-serif text-lg text-ink-900">{feature.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-ink-500">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Precios ─────────────────────────────────────────────────── */}
        <section id="precios" aria-labelledby="precios-titulo" className="flex scroll-mt-20 flex-col gap-8">
          <div className="text-center">
            <h2 id="precios-titulo" className="font-serif text-3xl font-light text-forest-800">
              Precios
            </h2>
            <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-ink-500">
              Se paga por evento, no por invitado: invitar a 300 personas cuesta lo mismo que
              invitar a 40.
            </p>
          </div>

          <PlanCards />

          <p className="text-center font-sans text-sm text-ink-500">
            Creas tu cuenta gratis, la armas completa y la ves antes de pagar.{" "}
            <a
              href={contactHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-cream-300 underline-offset-4 transition-colors hover:text-ink-900"
            >
              ¿Dudas? Escríbenos por {CONTACT_LABEL}
            </a>
            .
          </p>
        </section>

        {/* ── Preguntas ───────────────────────────────────────────────── */}
        <section aria-labelledby="preguntas">
          <h2 id="preguntas" className="text-center font-serif text-3xl font-light text-forest-800">
            Lo que más nos preguntan
          </h2>
          <dl className="mx-auto mt-10 max-w-2xl divide-y divide-cream-300">
            {PREGUNTAS.map((item) => (
              <div key={item.q} className="py-5">
                <dt className="font-serif text-lg text-ink-900">{item.q}</dt>
                <dd className="mt-2 font-sans text-sm leading-relaxed text-ink-500">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Cierre ──────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-gold-400/40 bg-cream-50 px-6 py-12 text-center">
          <h2 className="mx-auto max-w-[18ch] text-balance font-serif text-3xl font-light text-forest-800">
            Tu fiesta merece algo mejor que una imagen reenviada
          </h2>
          <Link
            href="/admin/registro"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-olive-600 px-8 py-3.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
          >
            Empezar gratis
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <footer className="flex flex-col items-center gap-4 border-t border-cream-300 pt-10 text-center">
          <Wordmark />
          <p className="font-sans text-xs text-ink-500">
            <Link href="/privacidad" className="underline underline-offset-4 hover:text-ink-900">
              Aviso de privacidad
            </Link>
            {" · "}
            <Link href="/terminos" className="underline underline-offset-4 hover:text-ink-900">
              Términos
            </Link>
          </p>
          <p className="font-sans text-[11px] text-ink-500/70">
            {BRAND.legalName} · Hecho en México
          </p>
        </footer>
      </div>
    </main>
  );
}
