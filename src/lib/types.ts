import type { InvitationStatusValue } from "@/lib/validations";

/** Datos del evento ya formateados para el cliente. */
export interface PublicEvent {
  name: string;
  /** Parte principal del nombre: "Maya · 29" → "Maya". */
  title: string;
  /** Parte secundaria del nombre, normalmente la edad: "Maya · 29" → "29". */
  highlight: string | null;
  subtitle: string | null;
  dateLabel: string;
  time: string;
  location: string;
  locationUrl: string | null;
  dressCode: string | null;
  dressCodeUrl: string | null;
  invitationImage: string | null;
}

/** DTO serializable que recibe la experiencia pública. */
export interface PublicInvitation {
  slug: string;
  guestName: string;
  guestCount: number;
  status: InvitationStatusValue;
  personalMessage: string | null;
  rsvp: {
    status: InvitationStatusValue;
    guestCount: number;
    comment: string | null;
  } | null;
  event: PublicEvent;
}
