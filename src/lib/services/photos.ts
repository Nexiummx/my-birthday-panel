import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { storage } from "@/lib/storage";
import { isShareCode } from "@/lib/share-code";
import type { RegisterPhotoInput, SignPhotoInput } from "@/lib/validations";

/**
 * Fotos que suben los invitados.
 *
 * Hay dos puertas de entrada y las dos son públicas, así que los límites viven
 * aquí y no en la ruta: cualquiera con el enlace puede llamar.
 *
 *   Con enlace de invitación → la foto queda firmada con el nombre del invitado,
 *                              sin pedirle nada.
 *   Con el código del evento → el QR de las mesas. Escribe su nombre a mano,
 *                              que es lo que permite a los acompañantes subir.
 */

/** Tope por evento. Evita que un enlace filtrado llene el almacenamiento. */
export const MAX_PHOTOS_PER_EVENT = 500;

/** El navegador ya comprime; esto es la red de seguridad del servidor. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface UploadContext {
  event: { id: string; name: string; shareCode: string; photosEnabled: boolean };
  /** Presente solo cuando se entró por el enlace de una invitación. */
  invitation: { id: string; guestName: string } | null;
}

/**
 * Resuelve quién está subiendo y a qué evento, a partir de una de las dos
 * puertas. El invitado manda su slug; el QR manda el código del evento.
 */
export async function resolveUploadContext(source: {
  code?: string;
  slug?: string;
}): Promise<UploadContext> {
  if (source.slug) {
    const invitation = await prisma.invitation.findUnique({
      where: { slug: source.slug },
      select: {
        id: true,
        guestName: true,
        event: {
          select: { id: true, name: true, shareCode: true, photosEnabled: true },
        },
      },
    });

    if (!invitation) {
      throw new ServiceError("La invitación no existe", 404);
    }
    return {
      event: invitation.event,
      invitation: { id: invitation.id, guestName: invitation.guestName },
    };
  }

  // isShareCode antes de la consulta: filtra la basura de la URL sin ir a la
  // base, que es lo que más se va a recibir en una ruta pública.
  if (!source.code || !isShareCode(source.code)) {
    throw new ServiceError("El evento no existe", 404);
  }

  const event = await prisma.event.findUnique({
    where: { shareCode: source.code },
    select: { id: true, name: true, shareCode: true, photosEnabled: true },
  });

  if (!event) {
    throw new ServiceError("El evento no existe", 404);
  }
  return { event, invitation: null };
}

/** Evento por su código público. Lo usan la página de subida y el recuerdo. */
export async function getEventByShareCode(code: string) {
  if (!isShareCode(code)) return null;
  return prisma.event.findUnique({ where: { shareCode: code } });
}

/**
 * Autoriza una subida y devuelve a dónde tiene que mandar el archivo el
 * navegador. El archivo no pasa por aquí: ver lib/storage.ts.
 */
export async function createUploadTicket(context: UploadContext, input: SignPhotoInput) {
  if (!context.event.photosEnabled) {
    throw new ServiceError("El anfitrión cerró la subida de fotos de este evento", 409);
  }

  if (!ALLOWED_TYPES.includes(input.contentType as (typeof ALLOWED_TYPES)[number])) {
    throw new ServiceError("Solo se aceptan imágenes JPG, PNG o WebP", 415);
  }

  if (input.bytes > MAX_PHOTO_BYTES) {
    throw new ServiceError("La foto pesa demasiado", 413);
  }

  const count = await prisma.photo.count({ where: { eventId: context.event.id } });
  if (count >= MAX_PHOTOS_PER_EVENT) {
    throw new ServiceError(
      `Este evento alcanzó el máximo de ${MAX_PHOTOS_PER_EVENT} fotos.`,
      409
    );
  }

  // El nombre lleva un identificador aleatorio: la URL pública no se puede
  // adivinar, que es el mismo trato que tienen los slugs de invitación.
  const path = `eventos/${context.event.id}/${crypto.randomUUID()}.${EXTENSIONS[input.contentType]}`;
  const target = await storage().createUpload(path, input.contentType);

  return { path, target };
}

/** Da de alta la foto una vez que el archivo ya está arriba. */
export async function registerPhoto(context: UploadContext, input: RegisterPhotoInput) {
  if (!context.event.photosEnabled) {
    throw new ServiceError("El anfitrión cerró la subida de fotos de este evento", 409);
  }

  // La ruta tiene que ser una que hayamos firmado nosotros para este evento: si
  // no, cualquiera podría colgar del evento un archivo ajeno del bucket.
  if (!input.path.startsWith(`eventos/${context.event.id}/`)) {
    throw new ServiceError("La ruta de la foto no corresponde a este evento", 400);
  }

  // El nombre del invitado manda sobre lo que llegue en el cuerpo: quien entra
  // con su enlace no puede firmar con el nombre de otro.
  const authorName = context.invitation?.guestName ?? input.authorName?.trim();
  if (!authorName) {
    throw new ServiceError("Escribe tu nombre para subir la foto", 400);
  }

  return prisma.photo.create({
    data: {
      eventId: context.event.id,
      invitationId: context.invitation?.id ?? null,
      authorName: authorName.slice(0, 80),
      storagePath: input.path,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      caption: input.caption?.trim() || null,
    },
  });
}

export type PhotoRecord = Awaited<ReturnType<typeof listPhotos>>[number];

/**
 * Fotos de un evento. `includeHidden` solo lo pone el panel: la galería pública
 * nunca ve lo que el anfitrión ocultó.
 */
export async function listPhotos(eventId: string, includeHidden = false) {
  return prisma.photo.findMany({
    where: { eventId, ...(includeHidden ? {} : { hiddenAt: null }) },
    orderBy: { createdAt: "desc" },
  });
}

/** Números del evento para el recuerdo y para el panel. */
export async function photoStats(eventId: string) {
  const [total, hidden, authors] = await Promise.all([
    prisma.photo.count({ where: { eventId } }),
    prisma.photo.count({ where: { eventId, hiddenAt: { not: null } } }),
    prisma.photo.groupBy({
      by: ["authorName"],
      where: { eventId, hiddenAt: null },
      _count: { authorName: true },
      orderBy: { _count: { authorName: "desc" } },
      take: 5,
    }),
  ]);

  return {
    total,
    hidden,
    visible: total - hidden,
    topAuthors: authors.map((row) => ({ name: row.authorName, count: row._count.authorName })),
  };
}

/** Comprueba que la foto es de un evento de esta cuenta antes de tocarla. */
async function requireOwnedPhoto(id: string, ownerId: string) {
  const photo = await prisma.photo.findFirst({
    where: { id, event: { ownerId } },
  });
  if (!photo) {
    throw new ServiceError("La foto no existe", 404);
  }
  return photo;
}

export async function setPhotoHidden(id: string, ownerId: string, hidden: boolean) {
  await requireOwnedPhoto(id, ownerId);
  return prisma.photo.update({
    where: { id },
    data: { hiddenAt: hidden ? new Date() : null },
  });
}

/** Borra la fila y el archivo. Ocultar es reversible; esto no. */
export async function deletePhoto(id: string, ownerId: string) {
  const photo = await requireOwnedPhoto(id, ownerId);
  await prisma.photo.delete({ where: { id } });
  // Después del borrado en base: si el almacenamiento falla queda un archivo
  // huérfano, que es mucho más barato que una foto visible que ya no se puede
  // administrar porque su fila desapareció.
  await storage().remove([photo.storagePath]);
}

/** URL pública de una foto. Vive aquí para que el panel no importe storage. */
export function photoUrl(storagePath: string): string {
  return storage().publicUrl(storagePath);
}
