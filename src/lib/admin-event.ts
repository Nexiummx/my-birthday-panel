import "server-only";
import type { EventRecord } from "@/lib/services/events";
import { datePolicy, type DatePolicy } from "@/lib/event-date";
import { formatLongDate } from "@/lib/utils";

/** Fila de evento ya serializada para el panel. */
export interface AdminEvent {
  id: string;
  /** Primera mitad de la ruta pública de sus invitaciones: /e/[slug]/i/[…]. */
  slug: string;
  name: string;
  /** ISO: el formulario la recorta a YYYY-MM-DD. */
  date: string;
  dateLabel: string;
  time: string;
  location: string;
  locationUrl: string | null;
  dressCode: string | null;
  dressCodeUrl: string | null;
  description: string | null;
  invitationImage: string | null;
  theme: string;
  inviteMessage: string | null;
  giftRegistryUrl: string | null;
  giftRegistryLabel: string | null;
  sealedEyebrow: string | null;
  sealedHeadline: string | null;
  sealedCta: string | null;
  archived: boolean;
  invitationCount: number;
  /** Si la fecha se puede mover, y hasta dónde. Ver lib/event-date.ts. */
  datePolicy: DatePolicy;
}

export function toAdminEvent(event: EventRecord): AdminEvent {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: event.date.toISOString(),
    dateLabel: formatLongDate(event.date),
    time: event.time,
    location: event.location,
    locationUrl: event.locationUrl,
    dressCode: event.dressCode,
    dressCodeUrl: event.dressCodeUrl,
    description: event.description,
    invitationImage: event.invitationImage,
    theme: event.theme,
    inviteMessage: event.inviteMessage,
    giftRegistryUrl: event.giftRegistryUrl,
    giftRegistryLabel: event.giftRegistryLabel,
    sealedEyebrow: event.sealedEyebrow,
    sealedHeadline: event.sealedHeadline,
    sealedCta: event.sealedCta,
    archived: event.archivedAt !== null,
    invitationCount: event._count.invitations,
    datePolicy: datePolicy(event),
  };
}
