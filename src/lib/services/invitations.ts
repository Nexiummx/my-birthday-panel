import "server-only";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import type { CreateInvitationInput, UpdateInvitationInput } from "@/lib/validations";
import type { InvitationStatus } from "@/generated/prisma/enums";

/** Error de negocio con mensaje seguro para mostrar al usuario. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const invitationWithRsvp = {
  rsvp: true,
  event: { select: { id: true, name: true } },
} as const;

export type InvitationRecord = Awaited<ReturnType<typeof listInvitations>>[number];

export async function listInvitations() {
  return prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: invitationWithRsvp,
  });
}

export async function getInvitationById(id: string) {
  return prisma.invitation.findUnique({ where: { id }, include: invitationWithRsvp });
}

/** Invitación pública con los datos del evento, para /i/[slug]. */
export async function getPublicInvitation(slug: string) {
  return prisma.invitation.findUnique({
    where: { slug },
    include: { event: true, rsvp: true },
  });
}

/** Evento por defecto: el MVP gestiona un evento a la vez. */
export async function getDefaultEvent() {
  return prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function createInvitation(input: CreateInvitationInput) {
  const eventId = input.eventId ?? (await getDefaultEvent())?.id;

  if (!eventId) {
    throw new ServiceError(
      "No existe ningún evento. Ejecuta `npm run db:seed` para crear el evento inicial.",
      409
    );
  }

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

export async function updateInvitation(id: string, input: UpdateInvitationInput) {
  const invitation = await prisma.invitation.findUnique({ where: { id } });
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

export async function deleteInvitation(id: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    throw new ServiceError("La invitación no existe", 404);
  }
  await prisma.invitation.delete({ where: { id } });
}
