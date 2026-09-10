import Link from "next/link";
import { CalendarPlus, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

/**
 * Lo que ve una pantalla del panel cuando todavía no hay evento.
 *
 * Distingue dos situaciones que antes se trataban igual, y esa confusión era
 * el peor momento del producto: a quien no tiene créditos se le decía "crea tu
 * evento", iba, y ahí se enteraba de que primero hay que activar el plan.
 * Tres clics para chocar contra un muro que se le podía haber dicho al primero.
 *
 * `quotaLimit` es el cupo COMPRADO, no el disponible: quien ya gastó su crédito
 * y archivó el evento sí sabe cómo funciona esto y no necesita el discurso de
 * bienvenida.
 */
export function NoEventState({ quotaLimit = 1 }: { quotaLimit?: number }) {
  const sinPlan = quotaLimit === 0;

  return (
    <EmptyState
      icon={
        sinPlan ? (
          <Sparkles className="size-8" aria-hidden="true" />
        ) : (
          <CalendarPlus className="size-8" aria-hidden="true" />
        )
      }
      title={sinPlan ? "Tu cuenta todavía no tiene eventos" : "Todavía no tienes un evento"}
      description={
        sinPlan
          ? "Cada evento consume un crédito y tu cuenta aún no tiene ninguno. Escríbenos y lo activamos: es cosa de minutos."
          : "Crea tu evento para elegir el tema de la invitación y empezar a invitar."
      }
      action={
        <Link
          href={sinPlan ? "/admin/pago" : "/admin/evento"}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-olive-600 px-5 py-2.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
        >
          {sinPlan ? "Ver planes" : "Crear evento"}
        </Link>
      }
    />
  );
}
