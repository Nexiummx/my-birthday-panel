import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { positionsFor } from "@/lib/rewind-selection";
import { photoUrl } from "@/lib/services/photos";
import type { SaveCurationInput } from "@/lib/validations";

/**
 * Lo que el anfitrión elige que salga en el recuerdo.
 *
 * Los topes no son decorativos: el recuerdo tiene una portada y tres rejillas
 * de cuatro, así que a partir de trece fotos lo de más no se vería y el
 * anfitrión creería que sí. Es mejor decírselo que tragárselo en silencio.
 */
export const MAX_REWIND_PHOTOS = 13;
export const MAX_REWIND_MESSAGES = 5;

/** Todo lo elegible de un evento, con lo que hoy está elegido. */
export async function getCuration(eventId: string, ownerId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ownerId },
    select: { id: true, name: true, shareCode: true },
  });
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  const [photos, rsvps] = await Promise.all([
    // Solo las visibles: una foto oculta no puede acabar en el recuerdo ni
    // aunque estuviera elegida de antes.
    prisma.photo.findMany({
      where: { eventId, hiddenAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rsvp.findMany({
      where: {
        status: "CONFIRMED",
        comment: { not: null },
        invitation: { eventId },
      },
      select: {
        id: true,
        comment: true,
        rewindOrder: true,
        invitation: { select: { guestName: true } },
      },
      orderBy: { respondedAt: "asc" },
    }),
  ]);

  return {
    event,
    photos: photos.map((photo) => ({
      id: photo.id,
      url: photoUrl(photo.storagePath),
      authorName: photo.authorName,
      caption: photo.caption,
      rewindOrder: photo.rewindOrder,
    })),
    messages: rsvps
      .filter((rsvp) => (rsvp.comment ?? "").trim().length > 0)
      .map((rsvp) => ({
        id: rsvp.id,
        author: rsvp.invitation.guestName,
        text: (rsvp.comment ?? "").trim(),
        rewindOrder: rsvp.rewindOrder,
      })),
  };
}

/**
 * Guarda la selección completa, no un cambio suelto.
 *
 * El panel manda siempre la lista entera en su orden, y aquí se borran todas
 * las posiciones y se reescriben. Es una operación idempotente: da igual si el
 * anfitrión encendió, apagó o movió, y no hay forma de que dos ediciones
 * seguidas dejen posiciones huérfanas o repetidas. Todo dentro de una
 * transacción, porque un recuerdo a medio reordenar es peor que uno sin tocar.
 */
export async function saveCuration(eventId: string, ownerId: string, input: SaveCurationInput) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ownerId },
    select: { id: true },
  });
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }

  if (input.photoIds.length > MAX_REWIND_PHOTOS) {
    throw new ServiceError(
      `El recuerdo muestra ${MAX_REWIND_PHOTOS} fotos como máximo. Quita alguna.`,
      400
    );
  }
  if (input.messageIds.length > MAX_REWIND_MESSAGES) {
    throw new ServiceError(
      `El recuerdo muestra ${MAX_REWIND_MESSAGES} mensajes como máximo. Quita alguno.`,
      400
    );
  }

  // Los ids llegan del cliente: se comprueba que sean de este evento antes de
  // escribir nada. Si no, se podría colar una foto de otra cuenta en el
  // recuerdo propio.
  const [validPhotos, validMessages] = await Promise.all([
    prisma.photo.findMany({
      where: { id: { in: input.photoIds }, eventId, hiddenAt: null },
      select: { id: true },
    }),
    prisma.rsvp.findMany({
      where: { id: { in: input.messageIds }, invitation: { eventId } },
      select: { id: true },
    }),
  ]);

  const photoOk = new Set(validPhotos.map((row) => row.id));
  const messageOk = new Set(validMessages.map((row) => row.id));
  const photoIds = input.photoIds.filter((id) => photoOk.has(id));
  const messageIds = input.messageIds.filter((id) => messageOk.has(id));

  const photoPositions = positionsFor(photoIds);
  const messagePositions = positionsFor(messageIds);

  await prisma.$transaction([
    prisma.photo.updateMany({ where: { eventId }, data: { rewindOrder: null } }),
    ...photoIds.map((id) =>
      prisma.photo.update({ where: { id }, data: { rewindOrder: photoPositions.get(id) } })
    ),
    prisma.rsvp.updateMany({ where: { invitation: { eventId } }, data: { rewindOrder: null } }),
    ...messageIds.map((id) =>
      prisma.rsvp.update({ where: { id }, data: { rewindOrder: messagePositions.get(id) } })
    ),
  ]);

  return { photos: photoIds.length, messages: messageIds.length };
}
