import "server-only";
import type { InvitationRecord } from "@/lib/services/invitations";
import type { InvitationStatusValue } from "@/lib/validations";
import { buildInvitationUrl, formatDateTime, formatShortDate } from "@/lib/utils";

/** Fila de invitación ya formateada para las tablas del panel. */
export interface AdminInvitation {
  id: string;
  slug: string;
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
}

export function toAdminInvitation(invitation: InvitationRecord): AdminInvitation {
  return {
    id: invitation.id,
    slug: invitation.slug,
    url: buildInvitationUrl(invitation.slug),
    guestName: invitation.guestName,
    guestCount: invitation.guestCount,
    status: invitation.status as InvitationStatusValue,
    personalMessage: invitation.personalMessage,
    createdAtLabel: formatShortDate(invitation.createdAt),
    respondedAtLabel: formatDateTime(invitation.rsvp?.respondedAt),
    respondedAt: invitation.rsvp?.respondedAt.toISOString() ?? null,
    rsvpGuestCount: invitation.rsvp?.guestCount ?? null,
    comment: invitation.rsvp?.comment ?? null,
  };
}
