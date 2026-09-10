import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptNullable, encryptNullable } from "@/lib/crypto/field-crypto";
import { ServiceError } from "@/lib/services/errors";
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
  // Por evento y slug, no por slug a secas: es la única forma de nombrar una
  // invitación sin ambigüedad desde que el slug del invitado es único solo
  // dentro de su evento.
  const invitation = await prisma.invitation.findFirst({
    where: { slug: input.slug, event: { slug: input.evento } },
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
  // Lo que escribió el invitado se guarda cifrado: ver field-crypto.ts.
  const comment = encryptNullable(input.comment?.trim() || null);
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

  // Se devuelve descifrado: la respuesta de la API la pinta el propio invitado
  // que acaba de escribirla.
  return {
    rsvp: { ...rsvp, comment: decryptNullable(rsvp.comment) },
    guestName: input.guestName,
  };
}
