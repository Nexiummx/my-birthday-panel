import type { Metadata } from "next";
import { ActivatePlanState } from "@/components/admin/ActivatePlanState";
import { EventManager } from "@/components/admin/EventManager";
import { getActiveEvent, getQuota, listEvents } from "@/lib/services/events";
import { toAdminEvent } from "@/lib/admin-event";
import { requirePanelContext } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eventos · Panel",
  robots: { index: false, follow: false },
};

export default async function EventsPage() {
  const { session } = await requirePanelContext();

  const [events, active, quota] = await Promise.all([
    listEvents(session.sub),
    getActiveEvent(session.sub),
    getQuota(session.sub),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Configuración
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">Eventos</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Cada evento tiene su propio tema, sus textos y su lista de invitados. El que esté “en
          edición” es sobre el que trabajan el resto de las pantallas.
        </p>
      </header>

      {/* Cupo 0 no es "alcanzaste tu límite": es una cuenta sin plan. Enseñarle
          el administrador de eventos con todo deshabilitado no le sirve de nada;
          lo que necesita es saber cuánto cuesta y a quién escribirle. */}
      {quota.limit === 0 ? (
        <ActivatePlanState accountEmail={session.email} />
      ) : (
        <EventManager
          events={events.map(toAdminEvent)}
          activeEventId={active?.id ?? null}
          quota={quota}
        />
      )}
    </div>
  );
}
