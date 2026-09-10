import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { storage } from "@/lib/storage";
import { belongsToEvent, mediaPath } from "@/lib/storage-paths";
import { MAX_AUDIO_BYTES, type SaveSoundtrackInput, type SignSoundtrackInput } from "@/lib/validations";

/**
 * La música del recuerdo.
 *
 * Es del anfitrión, no de los invitados: la sube desde el panel y vale para
 * todo el evento. Por eso no pasa por la puerta pública de las fotos aunque use
 * el mismo almacenamiento — quien puede poner la música de una fiesta es quien
 * la organiza.
 *
 * Solo se guarda el archivo y desde qué milisegundo empieza. Cuánto suena no se
 * guarda porque no se elige: suena lo que dure el video, y el video dura lo que
 * dure su guion.
 */

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
] as const;

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

/** El evento tiene que ser de esta cuenta antes de tocar nada suyo. */
async function requireOwnedEvent(eventId: string, ownerId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ownerId },
    select: { id: true, soundtrackPath: true },
  });
  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }
  return event;
}

export async function createSoundtrackTicket(
  eventId: string,
  ownerId: string,
  input: SignSoundtrackInput
) {
  await requireOwnedEvent(eventId, ownerId);

  if (!ALLOWED_AUDIO_TYPES.includes(input.contentType as (typeof ALLOWED_AUDIO_TYPES)[number])) {
    throw new ServiceError("Solo se aceptan MP3, M4A, WAV u OGG", 415);
  }
  if (input.bytes > MAX_AUDIO_BYTES) {
    throw new ServiceError("La canción pesa demasiado. Sube un MP3 de menos de 12 MB.", 413);
  }

  const path = mediaPath(
    eventId,
    "musica",
    `${crypto.randomUUID()}.${EXTENSIONS[input.contentType]}`
  );
  const target = await storage().createUpload(path, input.contentType);
  return { path, target };
}

/** Da de alta la canción y, si había otra, borra su archivo. */
export async function saveSoundtrack(
  eventId: string,
  ownerId: string,
  input: SaveSoundtrackInput
) {
  const event = await requireOwnedEvent(eventId, ownerId);

  // La misma comprobación que en las fotos: la ruta tiene que ser una que
  // hayamos firmado para este evento, o se podría apuntar a un archivo ajeno.
  if (!belongsToEvent(input.path, eventId)) {
    throw new ServiceError("La ruta de la canción no corresponde a este evento", 400);
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      soundtrackPath: input.path,
      soundtrackName: input.name.slice(0, 120),
      soundtrackStartMs: input.startMs,
    },
    select: { soundtrackPath: true, soundtrackName: true, soundtrackStartMs: true },
  });

  // El archivo anterior se borra después de que la fila apunte al nuevo: si
  // fuera al revés, un fallo entre las dos operaciones dejaría al evento
  // apuntando a un archivo que ya no existe.
  if (event.soundtrackPath && event.soundtrackPath !== input.path) {
    await storage().remove([event.soundtrackPath]);
  }

  return updated;
}

/** Mover el trozo que suena no vuelve a subir la canción. */
export async function setSoundtrackStart(eventId: string, ownerId: string, startMs: number) {
  const event = await requireOwnedEvent(eventId, ownerId);
  if (!event.soundtrackPath) {
    throw new ServiceError("Este evento no tiene música todavía", 409);
  }
  return prisma.event.update({
    where: { id: eventId },
    data: { soundtrackStartMs: startMs },
    select: { soundtrackStartMs: true },
  });
}

export async function removeSoundtrack(eventId: string, ownerId: string) {
  const event = await requireOwnedEvent(eventId, ownerId);
  if (!event.soundtrackPath) return { removed: false };

  await prisma.event.update({
    where: { id: eventId },
    data: { soundtrackPath: null, soundtrackName: null, soundtrackStartMs: 0 },
  });
  await storage().remove([event.soundtrackPath]);
  return { removed: true };
}
