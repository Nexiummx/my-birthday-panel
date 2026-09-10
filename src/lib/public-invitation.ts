import "server-only";
import type { PublicInvitation } from "@/lib/types";
import type { EventThemeValue, InvitationStatusValue } from "@/lib/validations";
import { resolveCopy } from "@/lib/themes";
import { formatInvitationDate } from "@/lib/utils";
import { getPublicInvitation } from "@/lib/services/invitations";

type InvitationWithEvent = NonNullable<Awaited<ReturnType<typeof getPublicInvitation>>>;

/**
 * Convierte el registro de Prisma en un DTO plano y ya formateado.
 * Las fechas se traducen en el servidor para que el idioma no dependa del
 * navegador del invitado y no haya desajustes de hidratación.
 */
export function toPublicInvitation(invitation: InvitationWithEvent): PublicInvitation {
  const { event } = invitation;
  const [title, highlight] = splitEventName(event.name);
  const theme = event.theme as EventThemeValue;

  return {
    slug: invitation.slug,
    guestName: invitation.guestName,
    guestCount: invitation.guestCount,
    status: invitation.status as InvitationStatusValue,
    personalMessage: invitation.personalMessage,
    rsvp: invitation.rsvp
      ? {
          status: invitation.rsvp.status as InvitationStatusValue,
          guestCount: invitation.rsvp.guestCount,
          comment: invitation.rsvp.comment,
        }
      : null,
    event: {
      slug: event.slug,
      name: event.name,
      title,
      highlight,
      subtitle: event.description,
      dateLabel: formatInvitationDate(event.date),
      dateIso: event.date.toISOString(),
      time: event.time,
      location: event.location,
      locationUrl: event.locationUrl,
      dressCode: event.dressCode,
      dressCodeUrl: event.dressCodeUrl,
      giftRegistryUrl: event.giftRegistryUrl,
      giftRegistryLabel: event.giftRegistryLabel,
      invitationImage: event.invitationImage,
      theme,
      photosEnabled: event.photosEnabled,
      // Lo que el anfitrión dejó vacío cae al texto por defecto del tema.
      copy: resolveCopy(theme, {
        eyebrow: event.sealedEyebrow,
        headline: event.sealedHeadline,
        cta: event.sealedCta,
      }),
    },
  };
}

/**
 * "Maya · 29" → ["Maya", "29"]. El separador "·" es opcional: sin él, el
 * nombre se muestra completo y no se dibuja el número destacado.
 */
function splitEventName(name: string): [string, string | null] {
  const parts = name.split("·").map((part) => part.trim());
  if (parts.length >= 2 && parts[1]) {
    return [parts[0], parts.slice(1).join(" · ")];
  }
  return [name.trim(), null];
}
