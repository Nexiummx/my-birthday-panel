import "server-only";
import type { TicketRecord } from "@/lib/services/tickets";
import type { TicketCategoryValue, TicketStatusValue } from "@/lib/validations";
import { formatDateTime } from "@/lib/utils";

/** Un mensaje del hilo, ya formateado para el panel. */
export interface AdminTicketMessage {
  id: string;
  fromTeam: boolean;
  authorEmail: string;
  body: string;
  atLabel: string;
}

export interface AdminTicket {
  id: string;
  subject: string;
  category: TicketCategoryValue;
  status: TicketStatusValue;
  eventId: string | null;
  eventName: string | null;
  /** Quién lo abrió. Solo se pinta en la bandeja del equipo. */
  ownerEmail: string;
  ownerName: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  messages: AdminTicketMessage[];
}

export function toAdminTicket(ticket: TicketRecord): AdminTicket {
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category as TicketCategoryValue,
    status: ticket.status as TicketStatusValue,
    eventId: ticket.event?.id ?? null,
    eventName: ticket.event?.name ?? null,
    ownerEmail: ticket.owner.email,
    ownerName: ticket.owner.name || ticket.owner.email,
    createdAtLabel: formatDateTime(ticket.createdAt),
    updatedAtLabel: formatDateTime(ticket.updatedAt),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      fromTeam: message.fromTeam,
      authorEmail: message.authorEmail,
      body: message.body,
      atLabel: formatDateTime(message.createdAt),
    })),
  };
}
