import "server-only";
import type { EventRecord } from "@/lib/services/events";
import { formatLongDate } from "@/lib/utils";

/** Fila de evento ya serializada para el panel. */
export interface AdminEvent {
  id: string;
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
  sealedEyebrow: string | null;
  sealedHeadline: string | null;
  sealedCta: string | null;
  archived: boolean;
  invitationCount: number;
}

export function toAdminEvent(event: EventRecord): AdminEvent {
  return {
    id: event.id,
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
    sealedEyebrow: event.sealedEyebrow,
    sealedHeadline: event.sealedHeadline,
    sealedCta: event.sealedCta,
    archived: event.archivedAt !== null,
    invitationCount: event._count.invitations,
  };
}
