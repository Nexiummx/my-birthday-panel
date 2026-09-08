import "server-only";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { ServiceError } from "@/lib/services/errors";
import type { CreateInvitationInput, UpdateInvitationInput } from "@/lib/validations";
import type { InvitationStatus } from "@/generated/prisma/enums";

const invitationWithRsvp = {
  rsvp: true,
  event: { select: { id: true, name: true } },
} as const;

export type InvitationRecord = Awaited<ReturnType<typeof listInvitations>>[number];

/**
 * Invitaciones de un evento.
 *
 * El filtro por `event.ownerId` no es redundante: sin él bastaría con conocer
 * el id de un evento ajeno para leer su lista de invitados. Toda consulta del
 * panel pasa por el dueño de la sesión, nunca solo por el id que llega del
 * cliente.
 */
export async function listInvitations(ownerId: string, eventId: string) {
  return prisma.invitation.findMany({
    where: { eventId, event: { ownerId } },
    orderBy: { createdAt: "desc" },
    include: invitationWithRsvp,
  });
}

export async function getInvitationById(id: string, ownerId: string) {
  return prisma.invitation.findFirst({
    where: { id, event: { ownerId } },
    include: invitationWithRsvp,
  });
}

/** Invitación pública con los datos del evento, para /i/[slug]. */
export async function getPublicInvitation(slug: string) {
  return prisma.invitation.findUnique({
    where: { slug },
    include: { event: true, rsvp: true },
  });
}

export async function createInvitation(
  ownerId: string,
  eventId: string,
  input: CreateInvitationInput
) {
  const event = await prisma.event.findFirst({ where: { id: eventId, ownerId } });
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  // El slug es único en toda la plataforma porque /i/[slug] no lleva prefijo de
  // cuenta: la comparación tiene que ser global, no por evento.
  const existing = await prisma.invitation.findMany({ select: { slug: true } });
  const slug = uniqueSlug(input.guestName, existing.map((row) => row.slug));

  return prisma.invitation.create({
    data: {
      eventId,
      slug,
      guestName: input.guestName,
      guestCount: input.guestCount,
      personalMessage: input.personalMessage?.trim() || null,
    },
    include: invitationWithRsvp,
  });
}

export async function updateInvitation(
  id: string,
  ownerId: string,
  input: UpdateInvitationInput
) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, event: { ownerId } },
  });
  if (!invitation) {
    throw new ServiceError("La invitación no existe", 404);
  }

  if (input.slug && input.slug !== invitation.slug) {
    const taken = await prisma.invitation.findUnique({ where: { slug: input.slug } });
    if (taken) {
      throw new ServiceError("Ese slug ya está en uso por otra invitación", 409);
    }
  }

  return prisma.invitation.update({
    where: { id },
    data: {
      guestName: input.guestName,
      guestCount: input.guestCount,
      slug: input.slug,
      status: input.status as InvitationStatus | undefined,
      personalMessage:
        input.personalMessage === undefined ? undefined : input.personalMessage.trim() || null,
    },
    include: invitationWithRsvp,
  });
}

export async function deleteInvitation(id: string, ownerId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, event: { ownerId } },
  });
  if (!invitation) {
    throw new ServiceError("La invitación no existe", 404);
  }
  await prisma.invitation.delete({ where: { id } });
}
