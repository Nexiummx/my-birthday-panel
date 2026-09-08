import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validations";
import type { EventTheme } from "@/generated/prisma/enums";

/** Recuerda qué evento está mirando el anfitrión entre visitas al panel. */
export const ACTIVE_EVENT_COOKIE = "bosque_event";

export type EventRecord = Awaited<ReturnType<typeof listEvents>>[number];

/**
 * Eventos de una cuenta. Los activos primero y, dentro de cada grupo, por
 * fecha del evento: lo que está por celebrarse es lo que se consulta.
 */
export async function listEvents(ownerId: string) {
  return prisma.event.findMany({
    where: { ownerId },
    orderBy: [{ archivedAt: "asc" }, { date: "asc" }],
    include: { _count: { select: { invitations: true } } },
  });
}

/** Un evento, solo si pertenece a la cuenta. Devuelve null si no. */
export async function getEvent(id: string, ownerId: string) {
  return prisma.event.findFirst({ where: { id, ownerId } });
}

/**
 * Evento sobre el que trabaja el panel: el último elegido si sigue siendo de
 * la cuenta, y si no el activo más próximo. La comprobación de dueño se repite
 * aquí a propósito — la cookie la controla el cliente.
 */
export async function getActiveEvent(ownerId: string) {
  const store = await cookies();
  const preferred = store.get(ACTIVE_EVENT_COOKIE)?.value;

  if (preferred) {
    const chosen = await prisma.event.findFirst({ where: { id: preferred, ownerId } });
    if (chosen) return chosen;
  }

  const active = await prisma.event.findFirst({
    where: { ownerId, archivedAt: null },
    orderBy: { date: "asc" },
  });
  if (active) return active;

  // Todo archivado: mejor mostrar el último que dejar el panel en blanco.
  return prisma.event.findFirst({ where: { ownerId }, orderBy: { date: "desc" } });
}

/** Eventos sin archivar: son los que consumen cupo. */
export async function countActiveEvents(ownerId: string) {
  return prisma.event.count({ where: { ownerId, archivedAt: null } });
}

/** Cupo de la cuenta y cuánto lleva usado. */
export async function getQuota(ownerId: string) {
  const [account, used] = await Promise.all([
    prisma.adminUser.findUnique({ where: { id: ownerId }, select: { eventQuota: true } }),
    countActiveEvents(ownerId),
  ]);

  const limit = account?.eventQuota ?? 0;
  return { limit, used, available: Math.max(0, limit - used) };
}

export async function createEvent(ownerId: string, input: CreateEventInput) {
  const { limit, used } = await getQuota(ownerId);

  if (used >= limit) {
    // Cupo 0 es el estado de una cuenta recién registrada, no un límite
    // alcanzado: decirle "archiva uno" a quien no tiene ninguno no ayuda.
    const message =
      limit === 0
        ? "Tu cuenta todavía no tiene eventos habilitados. Escríbenos para activar tu plan y empezar a invitar."
        : limit === 1
          ? "Tu plan incluye un evento a la vez. Archiva el actual o amplía tu plan para crear otro."
          : `Tu plan incluye ${limit} eventos a la vez y ya tienes ${used}. Archiva uno o amplía tu plan.`;

    // 402: el límite es comercial, no un error de la petición.
    throw new ServiceError(message, 402);
  }

  // toEventData deja todo opcional (lo comparte la edición), así que los
  // campos obligatorios se repiten aquí para que el tipo del create cuadre.
  return prisma.event.create({
    data: {
      ...toEventData(input),
      ownerId,
      name: input.name,
      date: input.date,
      time: input.time,
      location: input.location,
      theme: input.theme as EventTheme,
    },
  });
}

export async function updateEvent(id: string, ownerId: string, input: UpdateEventInput) {
  const event = await getEvent(id, ownerId);
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  const { archived, ...fields } = input;

  // Desarchivar vuelve a ocupar cupo, así que se comprueba igual que al crear.
  if (archived === false && event.archivedAt !== null) {
    const { limit, used } = await getQuota(ownerId);
    if (used >= limit) {
      throw new ServiceError(
        "No puedes reactivar este evento: ya alcanzaste el número de eventos activos de tu plan.",
        402
      );
    }
  }

  return prisma.event.update({
    where: { id },
    data: {
      ...toEventData(fields),
      archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
    },
  });
}

export async function deleteEvent(id: string, ownerId: string) {
  const event = await getEvent(id, ownerId);
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }
  // Las invitaciones y sus respuestas caen con el evento (onDelete: Cascade).
  await prisma.event.delete({ where: { id } });
}

/**
 * Normaliza el payload validado a columnas: los opcionales vacíos se guardan
 * como NULL para que la capa de presentación solo tenga que mirar por null.
 */
function toEventData(input: Partial<CreateEventInput>) {
  const text = (value: string | undefined) =>
    value === undefined ? undefined : value.trim() || null;

  return {
    name: input.name,
    date: input.date,
    time: input.time,
    location: input.location,
    locationUrl: text(input.locationUrl),
    dressCode: text(input.dressCode),
    dressCodeUrl: text(input.dressCodeUrl),
    description: text(input.description),
    invitationImage: text(input.invitationImage),
    theme: input.theme as EventTheme | undefined,
    sealedEyebrow: text(input.sealedEyebrow),
    sealedHeadline: text(input.sealedHeadline),
    sealedCta: text(input.sealedCta),
  };
}

/** Evento activo, o error de negocio si la cuenta todavía no tiene ninguno. */
export async function requireActiveEvent(ownerId: string) {
  const event = await getActiveEvent(ownerId);
  if (!event) {
    throw new ServiceError(
      "Todavía no has creado ningún evento. Crea uno para empezar a enviar invitaciones.",
      409
    );
  }
  return event;
}
