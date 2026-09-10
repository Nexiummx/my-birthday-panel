import type { EventThemeValue, InvitationStatusValue } from "@/lib/validations";
import type { ThemeCopy } from "@/lib/themes";

/** Datos del evento ya formateados para el cliente. */
export interface PublicEvent {
  /** Primera mitad de la ruta pública: /e/[slug]/i/[invitado]. */
  slug: string;
  name: string;
  /** Parte principal del nombre: "Maya · 29" → "Maya". */
  title: string;
  /** Parte secundaria del nombre, normalmente la edad: "Maya · 29" → "29". */
  highlight: string | null;
  subtitle: string | null;
  dateLabel: string;
  /** ISO de la fecha del evento. La cuenta atrás necesita un instante, no un texto. */
  dateIso: string;
  time: string;
  location: string;
  locationUrl: string | null;
  dressCode: string | null;
  dressCodeUrl: string | null;
  giftRegistryUrl: string | null;
  giftRegistryLabel: string | null;
  invitationImage: string | null;
  /** Estética con la que se renderiza la experiencia. */
  theme: EventThemeValue;
  /** Si está abierta la subida de fotos: decide si aparece el enlace. */
  photosEnabled: boolean;
  /** Textos de la portada, ya mezclados con los del tema. */
  copy: ThemeCopy;
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
