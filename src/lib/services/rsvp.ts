import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/invitations";
import type { RsvpInput } from "@/lib/validations";

/**
 * Registra o actualiza la respuesta de una invitación.
 *
 * Reglas de negocio:
 *  - una invitación solo puede tener un RSVP (upsert sobre la relación 1:1);
 *  - el invitado puede cambiar su respuesta las veces que quiera;
 *  - el número de personas nunca puede superar los pases asignados;
 *  - si declina, el número de personas se guarda en 0.
 */
export async function submitRsvp(input: RsvpInput) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: input.slug },
    select: { id: true, guestCount: true, guestName: true },
  });

  if (!invitation) {
    throw new ServiceError("La invitación no existe", 404);
  }

  if (input.attending && input.guestCount > invitation.guestCount) {
    throw new ServiceError(
      `Tu invitación tiene ${invitation.guestCount} ${
        invitation.guestCount === 1 ? "pase" : "pases"
      } disponibles`,
      422
    );
  }

  const status = input.attending ? "CONFIRMED" : "DECLINED";
  const guestCount = input.attending ? input.guestCount : 0;
  const comment = input.comment?.trim() || null;
  const respondedAt = new Date();

  // Una sola transacción: el RSVP y el estado de la invitación no pueden divergir.
  const [rsvp] = await prisma.$transaction([
    prisma.rsvp.upsert({
      where: { invitationId: invitation.id },
      create: { invitationId: invitation.id, status, guestCount, comment, respondedAt },
      update: { status, guestCount, comment, respondedAt },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status, guestName: input.guestName },
    }),
  ]);

  return { rsvp, guestName: input.guestName };
}
