import { Check } from "lucide-react";
import { PlanCheckoutButton } from "@/components/pricing/PlanCheckoutButton";
import { PLANS, contactHref, formatPrice, type Plan } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Las tres tarjetas de precio. Las comparten la portada pública y la pantalla
 * de activación del panel; la única diferencia es que dentro del panel ya
 * conocemos el correo de la cuenta y viaja en el mensaje de contacto.
 */
export function PlanCards({
  accountEmail,
  ctaLabel = "Contratar",
  plans = PLANS,
  checkout = false,
}: {
  accountEmail?: string;
  ctaLabel?: string;
  plans?: readonly Plan[];
  /**
   * true = pagar en línea con Mercado Pago. Solo lo pone el panel, y solo
   * cuando hay credenciales: en la portada no hay cuenta a la que acreditarle
   * los créditos, así que ahí siempre se escribe primero.
   */
  checkout?: boolean;
}) {
  return (
    <ul className="grid items-start gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className={cn(
            "flex h-full flex-col rounded-2xl border bg-cream-50 p-6",
            plan.featured ? "border-olive-600 ring-1 ring-olive-600/20" : "border-cream-300"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl text-ink-900">{plan.name}</h3>
            {plan.featured && (
              <span className="shrink-0 rounded-full bg-olive-600/12 px-2.5 py-1 font-sans text-[10px] font-medium uppercase tracking-wide text-olive-700">
                El más pedido
              </span>
            )}
          </div>

          <p className="mt-1 font-sans text-sm text-ink-500">{plan.audience}</p>

          <p className="mt-5 flex items-baseline gap-1.5">
            <span className="font-serif text-4xl font-light text-forest-800">
              {formatPrice(plan.price)}
            </span>
            <span className="font-sans text-xs text-ink-500">MXN · {plan.period}</span>
          </p>

          <ul className="mt-5 flex flex-1 flex-col gap-2 border-t border-cream-200 pt-5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2 font-sans text-sm leading-snug text-ink-700">
                <Check className="mt-0.5 size-4 shrink-0 text-olive-600" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>

          {checkout ? (
            <PlanCheckoutButton planId={plan.id} label={ctaLabel} featured={plan.featured} />
          ) : (
            <a
              href={contactHref({ plan, accountEmail })}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 font-sans text-sm font-medium transition-colors",
                plan.featured
                  ? "bg-olive-600 text-cream-50 hover:bg-olive-700"
                  : "border border-cream-300 text-ink-700 hover:border-gold-400 hover:text-ink-900"
              )}
            >
              {ctaLabel}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
