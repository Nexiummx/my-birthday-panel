import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { describeWindow, isSameDay, isWithinWindow } from "@/lib/event-date";
import { newShareCode } from "@/lib/share-code";
import { storage } from "@/lib/storage";
import { eventSlug } from "@/lib/slug";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validations";
import type { EventTheme } from "@/generated/prisma/enums";

/** Recuerda qué evento está mirando el anfitrión entre visitas al panel. */
export const ACTIVE_EVENT_COOKIE = "active_event";

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

/** Eventos sin archivar. Ya no decide el cupo: es solo un dato del panel. */
export async function countActiveEvents(ownerId: string) {
  return prisma.event.count({ where: { ownerId, archivedAt: null } });
}

/**
 * Créditos de la cuenta: comprados, consumidos y disponibles.
 *
 * `used` sale de un contador de la cuenta y no de contar filas de `events`. La
 * diferencia importa: contar filas haría que borrar un evento devolviera el
 * crédito, y ese es justo el atajo que la regla existe para cerrar.
 */
export async function getQuota(ownerId: string) {
  const account = await prisma.adminUser.findUnique({
    where: { id: ownerId },
    select: { eventQuota: true, eventsUsed: true },
  });

  const limit = account?.eventQuota ?? 0;
  const used = account?.eventsUsed ?? 0;
  return { limit, used, available: Math.max(0, limit - used) };
}

export async function createEvent(ownerId: string, input: CreateEventInput) {
  // Consumir y comprobar en la misma transacción, en ese orden: si se
  // comprobara antes de incrementar, dos peticiones simultáneas con un solo
  // crédito pasarían las dos. Aquí la segunda ve su propio incremento y
  // revienta, y el rollback deshace el consumo.
  return prisma.$transaction(async (tx) => {
    const account = await tx.adminUser.update({
      where: { id: ownerId },
      data: { eventsUsed: { increment: 1 } },
      select: { eventQuota: true, eventsUsed: true },
    });

    if (account.eventsUsed > account.eventQuota) {
      // 402: el límite es comercial, no un error de la petición.
      throw new ServiceError(outOfCreditsMessage(account.eventQuota), 402);
    }

    // Los slugs de evento son un espacio compartido por todos los clientes:
    // la comparación es global a propósito, al revés que la de los invitados.
    const taken = await tx.event.findMany({ select: { slug: true } });
    const used = taken.map((row) => row.slug);

    // El anfitrión puede escribirlo; si no, sale del nombre. Cuando lo escribe
    // y está ocupado se le dice, en vez de numerárselo por detrás: pidió ese y
    // no otro.
    if (input.slug && used.includes(input.slug)) {
      throw new ServiceError("Ese enlace ya está en uso por otro evento", 409);
    }

    // toEventData deja todo opcional (lo comparte la edición), así que los
    // campos obligatorios se repiten aquí para que el tipo del create cuadre.
    return tx.event.create({
      data: {
        ...toEventData(input),
        ownerId,
        slug: input.slug || eventSlug(input.name, used),
        name: input.name,
        date: input.date,
        // El ancla de la regla de fecha nace con el evento y no se toca más.
        originalDate: input.date,
        // 32^10 combinaciones: no se reintenta ante colisión porque no va a
        // haberla, y la restricción única la convertiría en error visible.
        shareCode: newShareCode(),
        time: input.time,
        location: input.location,
        theme: input.theme as EventTheme,
      },
    });
  });
}

/** Por qué no puede crear otro evento, dicho de forma útil. */
function outOfCreditsMessage(limit: number) {
  // Crédito 0 es el estado de una cuenta recién registrada, no un límite
  // alcanzado: decirle "ya usaste los tuyos" a quien nunca tuvo ninguno confunde.
  if (limit === 0) {
    return "Tu cuenta todavía no tiene eventos habilitados. Escríbenos para activar tu plan y empezar a invitar.";
  }
  return limit === 1
    ? "Tu plan incluye un evento y ya lo usaste. Archivar el anterior no libera el crédito: para otra fiesta hace falta otro evento."
    : `Tu plan incluye ${limit} eventos y ya los usaste todos. Archivar los anteriores no libera créditos: para otra fiesta hace falta ampliar tu plan.`;
}

export async function updateEvent(id: string, ownerId: string, input: UpdateEventInput) {
  const event = await getEvent(id, ownerId);
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  const { archived, photosEnabled, ...fields } = input;
  // Vacío es "déjalo como está": undefined le dice a Prisma que no toque la
  // columna, mientras que "" la sobrescribiría con un slug que no existe.
  const slug = input.slug || undefined;

  // Renombrar la ruta pública es cosa seria: los enlaces ya enviados apuntan al
  // slug viejo y dejan de funcionar. Se permite porque el anfitrión lo pide
  // antes de mandar nada —el slug de fábrica sale del nombre y casi siempre
  // quiere retocarlo—, y la pantalla lo avisa.
  if (slug && slug !== event.slug) {
    const taken = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (taken) {
      throw new ServiceError("Ese enlace ya está en uso por otro evento", 409);
    }
  }

  // Archivar y desarchivar ya no tocan créditos: el crédito se gastó al crear.

  // La fecha es el único campo con regla propia, porque es el que convierte un
  // evento viejo en uno nuevo sin pagar. Ver lib/event-date.ts.
  const movesDate = fields.date !== undefined && !isSameDay(fields.date, event.date);

  if (movesDate) {
    if (event.dateChangedAt !== null) {
      throw new ServiceError(
        "Este evento ya usó su único cambio de fecha. Abre un ticket y lo movemos nosotros.",
        409
      );
    }

    if (!isWithinWindow(fields.date!, event.originalDate)) {
      throw new ServiceError(
        `La fecha solo puede moverse ${describeWindow(event.originalDate)}. Para una fecha fuera de ese rango, abre un ticket.`,
        409
      );
    }
  }

  return prisma.event.update({
    where: { id },
    data: {
      ...toEventData(fields),
      slug,
      // Se marca solo cuando la fecha se movió de verdad: guardar el formulario
      // sin tocarla no puede consumir el único cambio disponible.
      dateChangedAt: movesDate ? new Date() : undefined,
      photosEnabled,
      archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
    },
  });
}

/**
 * Mueve la fecha saltándose la regla. Solo para el equipo, desde un ticket: es
 * la válvula de escape que hace tolerable una regla estricta.
 */
export async function overrideEventDate(id: string, date: Date) {
  return prisma.event.update({
    where: { id },
    // El ancla se recoloca: a partir de aquí la ventana del cliente se mide
    // desde la fecha nueva, y se le devuelve su cambio.
    data: { date, originalDate: date, dateChangedAt: null },
  });
}

/**
 * Borra un evento y, con él, sus archivos.
 *
 * La base se limpia sola —invitaciones, respuestas y fotos caen por
 * `onDelete: Cascade`—, pero el almacenamiento no sabe nada de eso: hasta
 * ahora las fotos, los videos, sus portadas y la canción se quedaban en el
 * bucket para siempre, ocupando y costando, sin ninguna fila que los nombrara.
 * Es basura que nadie iba a encontrar nunca.
 *
 * Las rutas se leen ANTES de borrar la fila, que es cuando todavía se sabe
 * cuáles son.
 */
export async function deleteEvent(id: string, ownerId: string) {
  const event = await getEvent(id, ownerId);
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  const media = await prisma.photo.findMany({
    where: { eventId: id },
    select: { storagePath: true, posterPath: true },
  });

  const archivos = [
    ...media.map((row) => row.storagePath),
    ...media.flatMap((row) => (row.posterPath ? [row.posterPath] : [])),
    ...(event.soundtrackPath ? [event.soundtrackPath] : []),
  ];

  // Las invitaciones y sus respuestas caen con el evento (onDelete: Cascade).
  await prisma.event.delete({ where: { id } });

  // Los archivos van después y sin poder tumbar la operación. El orden importa:
  // borrarlos primero y fallar el DELETE dejaría un evento vivo con las fotos
  // rotas, que para el anfitrión es peor que unos archivos de más. Y un fallo
  // aquí solo cuesta espacio, no corrección.
  if (archivos.length > 0) {
    try {
      await storage().remove(archivos);
    } catch (error) {
      console.error(`[almacenamiento] no se pudieron borrar los archivos de ${id}:`, error);
    }
  }
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
