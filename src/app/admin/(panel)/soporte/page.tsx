import type { Metadata } from "next";
import { TicketBoard, type TicketDraft } from "@/components/admin/TicketBoard";
import { listTickets } from "@/lib/services/tickets";
import { listEvents } from "@/lib/services/events";
import { toAdminTicket } from "@/lib/admin-ticket";
import { requirePanelContext } from "@/lib/panel";
import { TICKET_CATEGORIES, type TicketCategoryValue } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Soporte · Panel",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Lee un parámetro de la URL como cadena simple. */
function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SupportPage({ searchParams }: Props) {
  const { session } = await requirePanelContext();

  const [tickets, events, params] = await Promise.all([
    listTickets(session.sub),
    listEvents(session.sub),
    searchParams,
  ]);

  // El formulario del evento manda aquí con el asunto escrito cuando alguien
  // choca con la regla de la fecha. La categoría se valida contra el catálogo:
  // viene de la URL y podría traer cualquier cosa.
  const subject = one(params.asunto);
  const category = one(params.categoria);
  const draft: TicketDraft | undefined = subject
    ? {
        subject,
        category: TICKET_CATEGORIES.includes(category as TicketCategoryValue)
          ? (category as TicketCategoryValue)
          : "OTHER",
        eventId: one(params.evento),
      }
    : undefined;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">Ayuda</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">Soporte</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Para lo que el panel no resuelve solo: mover la fecha más allá del mes permitido, sumar
          un evento a tu plan o cualquier duda. Te respondemos aquí y te avisamos por correo.
        </p>
      </header>

      <TicketBoard
        tickets={tickets.map(toAdminTicket)}
        events={events.map((event) => ({ id: event.id, name: event.name }))}
        draft={draft}
      />
    </div>
  );
}
