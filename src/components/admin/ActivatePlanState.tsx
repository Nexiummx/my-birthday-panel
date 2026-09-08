import { Sparkles } from "lucide-react";
import { PlanCards } from "@/components/pricing/PlanCards";
import { CONTACT, CONTACT_LABEL, contactHref } from "@/lib/pricing";

/**
 * Lo que ve una cuenta con cupo 0: recién registrada o sin plan vigente.
 *
 * Antes esta ruta era un callejón sin salida —el botón de crear evento salía
 * deshabilitado y el error decía "escríbenos" sin decir dónde ni cuánto—. Es
 * justo el momento en que alguien decide si paga, así que aquí van el precio y
 * el enlace de contacto con el correo de la cuenta ya escrito.
 */
export function ActivatePlanState({ accountEmail }: { accountEmail: string }) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-dashed border-cream-300 bg-cream-50/60 px-6 py-8 text-center">
        <Sparkles className="mx-auto size-7 text-gold-500" aria-hidden="true" />
        <h2 className="mt-3 font-serif text-2xl font-light text-forest-800">
          Tu cuenta está lista, falta activar tu plan
        </h2>
        <p className="mx-auto mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-500">
          Elige el plan que te sirva y escríbenos por {CONTACT_LABEL}. En cuanto quede el pago
          habilitamos tu cupo y podrás crear tu evento desde esta misma pantalla.
        </p>
        <p className="mt-3 font-sans text-xs text-ink-500">
          Tu cuenta es <span className="text-ink-700">{accountEmail}</span> · {CONTACT.email}
        </p>
      </div>

      <PlanCards accountEmail={accountEmail} ctaLabel="Quiero este plan" />

      <p className="text-center font-sans text-xs text-ink-500">
        ¿No sabes cuál te toca?{" "}
        <a
          href={contactHref({ accountEmail })}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-cream-300 underline-offset-4 transition-colors hover:text-ink-900"
        >
          Cuéntanos tu evento y te decimos
        </a>
        .
      </p>
    </div>
  );
}
