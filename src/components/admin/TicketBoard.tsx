"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { NewTicketModal, TicketThreadModal } from "@/components/admin/TicketModals";
import type { AdminTicket } from "@/lib/admin-ticket";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketCategoryValue,
  type TicketStatusValue,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<TicketStatusValue, string> = {
  OPEN: "bg-gold-500/12 text-gold-600 border-gold-500/30",
  ANSWERED: "bg-olive-600/12 text-olive-700 border-olive-600/25",
  CLOSED: "bg-cream-200 text-ink-500 border-cream-300",
};

export interface TicketDraft {
  subject?: string;
  category?: TicketCategoryValue;
  eventId?: string;
}

/**
 * Bandeja de tickets. La misma para el cliente y para el equipo: cambia quién
 * puede abrirlos (solo el cliente) y si se muestra de quién es cada uno.
 */
export function TicketBoard({
  tickets,
  team = false,
  events = [],
  draft,
}: {
  tickets: AdminTicket[];
  team?: boolean;
  events?: { id: string; name: string }[];
  draft?: TicketDraft;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  // El panel del evento manda aquí con el asunto ya escrito cuando alguien
  // choca con la regla de la fecha; en ese caso el formulario se abre solo.
  const [creating, setCreating] = useState(Boolean(draft));

  // Se busca por id en cada render en vez de guardar el ticket: tras responder,
  // router.refresh() trae objetos nuevos y guardarlo dejaría el hilo congelado.
  // Si el ticket ya no está, el modal se cierra solo porque recibe null.
  const selected = tickets.find((ticket) => ticket.id === openId) ?? null;

  return (
    <div className="space-y-6">
      {!team && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            icon={<MessageSquarePlus className="size-4" aria-hidden="true" />}
          >
            Abrir ticket
          </Button>
        </div>
      )}

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="size-8" aria-hidden="true" />}
          title={team ? "No hay tickets" : "No tienes tickets abiertos"}
          description={
            team
              ? "Aquí llegan las peticiones de los clientes: cambios de fecha fuera de rango, planes y todo lo que el panel no resuelve solo."
              : "Si necesitas algo que el panel no te deja hacer —mover la fecha más de un mes, por ejemplo— pídelo por aquí."
          }
          action={
            team ? undefined : (
              <Button size="sm" className="mt-2" onClick={() => setCreating(true)}>
                Abrir ticket
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => {
            const last = ticket.messages[ticket.messages.length - 1];
            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(ticket.id)}
                  className="w-full rounded-2xl border border-cream-200 bg-cream-50 p-4 text-left transition-colors hover:border-gold-400 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg text-ink-900">{ticket.subject}</p>
                      <p className="mt-1 font-sans text-xs text-ink-500">
                        {TICKET_CATEGORY_LABELS[ticket.category]}
                        {ticket.eventName && ` · ${ticket.eventName}`}
                        {team && ` · ${ticket.ownerName}`}
                        {` · ${ticket.updatedAtLabel}`}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium tracking-wide",
                        STATUS_STYLES[ticket.status]
                      )}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </div>

                  {last && (
                    <p className="mt-2 line-clamp-2 font-sans text-sm text-ink-500">
                      <span className="text-ink-700">{last.fromTeam ? "Equipo" : "Cliente"}:</span>{" "}
                      {last.body}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <NewTicketModal
        open={creating}
        events={events}
        draft={draft}
        onClose={() => setCreating(false)}
        onSaved={() => router.refresh()}
      />

      <TicketThreadModal
        ticket={selected}
        team={team}
        onClose={() => setOpenId(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
