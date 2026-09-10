import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptNullable, encryptNullable } from "@/lib/crypto/field-crypto";
import { uniqueSlug } from "@/lib/slug";
import { ServiceError } from "@/lib/services/errors";
import type {
  CreateInvitationInput,
  ImportInvitationsInput,
  UpdateInvitationInput,
} from "@/lib/validations";
import type { InvitationStatus } from "@/generated/prisma/enums";

const invitationWithRsvp = {
  rsvp: true,
  // El slug del evento viaja con la invitación porque es la primera mitad de su
  // URL pública: sin él el panel no puede construir el enlace que se envía.
  event: { select: { id: true, name: true, slug: true } },
} as const;

/**
 * Devuelve la invitación con sus campos sensibles ya descifrados.
 *
 * El descifrado vive en la capa de servicios y no en una extensión de Prisma a
 * propósito. Una extensión que reescribe consultas por debajo es invisible en
 * el diff, y el día que alguien añada un `select` nuevo devolvería el texto
 * cifrado a una pantalla que no lo espera, sin que TypeScript avise. Así, si se
 * olvida una llamada, lo que sale en pantalla es un `v1:…` evidente.
 *
 * Ver src/lib/crypto/field-crypto.ts para qué se cifra y por qué.
 */
function reveal<T extends { phone?: string | null; personalMessage?: string | null; rsvp?: { comment: string | null } | null }>(
  invitation: T
): T {
  return {
    ...invitation,
    ...(invitation.phone !== undefined ? { phone: decryptNullable(invitation.phone) } : {}),
    ...(invitation.personalMessage !== undefined
      ? { personalMessage: decryptNullable(invitation.personalMessage) }
      : {}),
    ...(invitation.rsvp
      ? { rsvp: { ...invitation.rsvp, comment: decryptNullable(invitation.rsvp.comment) } }
      : {}),
  };
}

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
  const rows = await prisma.invitation.findMany({
    where: { eventId, event: { ownerId } },
    orderBy: { createdAt: "desc" },
    include: invitationWithRsvp,
  });
  return rows.map(reveal);
}

export async function getInvitationById(id: string, ownerId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, event: { ownerId } },
    include: invitationWithRsvp,
  });
  return invitation ? reveal(invitation) : null;
}

/**
 * Invitación pública, para /e/[evento]/i/[slug].
 *
 * Pide las dos mitades de la ruta y no solo la del invitado: el slug del
 * invitado ya no es único en toda la plataforma, así que buscar solo por él
 * sería preguntar por algo que puede estar en dos eventos.
 */
export async function getPublicInvitation(eventSlug: string, slug: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { slug, event: { slug: eventSlug } },
    include: { event: true, rsvp: true },
  });
  return invitation ? reveal(invitation) : null;
}

/**
 * Invitación por su slug a secas, para redirigir los enlaces antiguos de
 * /i/[slug] a su ruta nueva.
 *
 * Solo sirve para eso. Los slugs que existían antes de este cambio sí eran
 * únicos en toda la plataforma, así que para ellos la respuesta no es ambigua;
 * para los nuevos puede haber empate y por eso no se usa en ninguna otra parte.
 */
export async function findLegacyInvitation(slug: string) {
  return prisma.invitation.findFirst({
    where: { slug },
    select: { slug: true, event: { select: { slug: true } } },
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

  // Solo los slugs de ESTE evento: es donde tienen que ser únicos. Antes se
  // leía la tabla entera, que además de innecesario crecía con cada cliente.
  const existing = await prisma.invitation.findMany({
    where: { eventId },
    select: { slug: true },
  });
  const slug = uniqueSlug(input.guestName, existing.map((row) => row.slug));

  const created = await prisma.invitation.create({
    data: {
      eventId,
      slug,
      guestName: input.guestName,
      guestCount: input.guestCount,
      phone: encryptNullable(input.phone?.trim() || null),
      personalMessage: encryptNullable(input.personalMessage?.trim() || null),
    },
    include: invitationWithRsvp,
  });
  return reveal(created);
}

/**
 * Alta de varias invitaciones de una vez.
 *
 * Los slugs se acumulan sobre la marcha además de leerse de la base: dos
 * "Ana García" en el mismo pegado tienen que salir con slugs distintos, y
 * consultando solo lo ya guardado ambas recibirían el mismo.
 *
 * Va en transacción: o entran todas o no entra ninguna. Una importación a
 * medias deja al anfitrión sin saber por dónde iba.
 */
export async function importInvitations(
  ownerId: string,
  eventId: string,
  guests: ImportInvitationsInput["guests"]
) {
  const event = await prisma.event.findFirst({ where: { id: eventId, ownerId } });
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  const existing = await prisma.invitation.findMany({
    where: { eventId },
    select: { slug: true },
  });
  const taken = new Set(existing.map((row) => row.slug));

  const rows = guests.map((guest) => {
    const slug = uniqueSlug(guest.guestName, taken);
    taken.add(slug);
    return {
      eventId,
      slug,
      guestName: guest.guestName,
      guestCount: guest.guestCount,
      phone: encryptNullable(guest.phone?.trim() || null),
    };
  });

  await prisma.$transaction(rows.map((data) => prisma.invitation.create({ data })));

  return { created: rows.length };
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
    const taken = await prisma.invitation.findFirst({
      where: { slug: input.slug, eventId: invitation.eventId },
      select: { id: true },
    });
    if (taken) {
      throw new ServiceError("Ese slug ya está en uso por otra invitación", 409);
    }
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: {
      guestName: input.guestName,
      guestCount: input.guestCount,
      phone: input.phone === undefined ? undefined : encryptNullable(input.phone.trim() || null),
      slug: input.slug,
      status: input.status as InvitationStatus | undefined,
      personalMessage:
        input.personalMessage === undefined
          ? undefined
          : encryptNullable(input.personalMessage.trim() || null),
    },
    include: invitationWithRsvp,
  });
  return reveal(updated);
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

/* ───────────────────── Envío, apertura y entrada ───────────────────── */

/**
 * Registra que un invitado ABRIÓ su invitación.
 *
 * Se llama desde el navegador y no desde el render de la página a propósito.
 * WhatsApp, Telegram y los buscadores piden el HTML para armar la miniatura;
 * contarlos haría creer al anfitrión que su invitado ya la vio, y eso no es un
 * dato inexacto: es un dato que le hace tomar la decisión equivocada —dejar de
 * insistirle a quien nunca la recibió—.
 *
 * Nunca lanza. Un fallo aquí no puede romper la experiencia del invitado, que
 * es lo único que de verdad importa en esa página.
 */
export async function trackInvitationView(eventSlug: string, slug: string): Promise<void> {
  try {
    const now = new Date();
    // El evento acota la escritura igual que acota la lectura: sin él, un slug
    // repetido en dos eventos sumaría la visita en los dos.
    const target = { slug, event: { slug: eventSlug } };

    // Dos escrituras y no una: firstViewedAt solo debe fijarse la primera vez
    // —es la señal de "le llegó", y pisarla borraría cuándo ocurrió—, y eso
    // pide una condición que un update por id no puede expresar.
    await prisma.invitation.updateMany({
      where: { ...target, firstViewedAt: null },
      data: { firstViewedAt: now },
    });

    await prisma.invitation.updateMany({
      where: target,
      data: { lastViewedAt: now, viewCount: { increment: 1 } },
    });
  } catch {
    /* una visita no contada no vale romper la invitación */
  }
}

/** Marca o desmarca invitaciones como enviadas. En bloque: se manda por tandas. */
export async function markInvitationsSent(
  ownerId: string,
  eventId: string,
  ids: string[],
  sent: boolean
) {
  const { count } = await prisma.invitation.updateMany({
    // El cruce por dueño va aquí y no en la ruta: los ids llegan del cliente.
    where: { id: { in: ids }, eventId, event: { ownerId } },
    data: { sentAt: sent ? new Date() : null },
  });
  return { updated: count };
}

/**
 * Registra la llegada de un invitado. `count` es cuántas personas de su pase
 * entraron de verdad, que no siempre coincide con lo que confirmó: en una
 * fiesta se cae gente y aparece gente.
 *
 * Con 0 se deshace la entrada, porque en la puerta se marca mal con el pulgar
 * y tiene que poder corregirse sin buscar otro botón.
 */
export async function checkInInvitation(id: string, ownerId: string, count: number) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, event: { ownerId } },
  });
  if (!invitation) {
    throw new ServiceError("La invitación no existe", 404);
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: {
      checkedInAt: count > 0 ? (invitation.checkedInAt ?? new Date()) : null,
      checkedInCount: count,
    },
    include: invitationWithRsvp,
  });
  return reveal(updated);
}

/** Todo lo de un evento, para exportar. Incluye la respuesta del invitado. */
export async function listForExport(ownerId: string, eventId: string) {
  const rows = await prisma.invitation.findMany({
    where: { eventId, event: { ownerId } },
    orderBy: { guestName: "asc" },
    include: { rsvp: true },
  });
  return rows.map(reveal);
}
