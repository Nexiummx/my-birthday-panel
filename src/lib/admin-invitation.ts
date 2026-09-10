import "server-only";
import type { InvitationRecord } from "@/lib/services/invitations";
import type { InvitationStatusValue } from "@/lib/validations";
import { stageOf, type InviteStage } from "@/lib/invite-stage";
import { formatPhone } from "@/lib/phone";
import { buildInvitationUrl, formatDateTime, formatShortDate, invitationPath } from "@/lib/utils";

/** Fila de invitación ya formateada para las tablas del panel. */
export interface AdminInvitation {
  id: string;
  slug: string;
  /** Ruta relativa, para los enlaces del panel. */
  path: string;
  /** URL completa, que es la que se copia y se manda por WhatsApp. */
  url: string;
  guestName: string;
  guestCount: number;
  status: InvitationStatusValue;
  personalMessage: string | null;
  createdAtLabel: string;
  respondedAtLabel: string;
  respondedAt: string | null;
  rsvpGuestCount: number | null;
  comment: string | null;

  /** Teléfono como lo escribió el anfitrión, y en bonito para enseñarlo. */
  phone: string | null;
  phoneLabel: string | null;

  /** En qué punto del camino está. Ver lib/invite-stage.ts. */
  stage: InviteStage;
  sentAtLabel: string | null;
  firstViewedAtLabel: string | null;
  viewCount: number;

  checkedIn: boolean;
  checkedInCount: number;
}

export function toAdminInvitation(invitation: InvitationRecord): AdminInvitation {
  return {
    id: invitation.id,
    slug: invitation.slug,
    path: invitationPath(invitation.event.slug, invitation.slug),
    url: buildInvitationUrl(invitation.event.slug, invitation.slug),
    guestName: invitation.guestName,
    guestCount: invitation.guestCount,
    status: invitation.status as InvitationStatusValue,
    personalMessage: invitation.personalMessage,
    createdAtLabel: formatShortDate(invitation.createdAt),
    respondedAtLabel: formatDateTime(invitation.rsvp?.respondedAt),
    respondedAt: invitation.rsvp?.respondedAt.toISOString() ?? null,
    rsvpGuestCount: invitation.rsvp?.guestCount ?? null,
    comment: invitation.rsvp?.comment ?? null,

    phone: invitation.phone,
    phoneLabel: formatPhone(invitation.phone),

    stage: stageOf(invitation),
    sentAtLabel: invitation.sentAt ? formatDateTime(invitation.sentAt) : null,
    firstViewedAtLabel: invitation.firstViewedAt
      ? formatDateTime(invitation.firstViewedAt)
      : null,
    viewCount: invitation.viewCount,

    checkedIn: invitation.checkedInAt !== null,
    checkedInCount: invitation.checkedInCount,
  };
}
