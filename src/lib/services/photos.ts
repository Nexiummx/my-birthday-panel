import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { storage } from "@/lib/storage";
import { isShareCode } from "@/lib/share-code";
import { belongsToEvent, mediaPath } from "@/lib/storage-paths";
import type { RegisterPhotoInput, SignPhotoInput } from "@/lib/validations";

/**
 * Fotos y videos que suben los invitados.
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

/**
 * Los videos tienen su propio tope y es mucho más bajo. Un clip comprimido pesa
 * como treinta fotos, así que contarlos en el mismo cupo dejaría a un evento sin
 * sitio para fotos por culpa de veinte videos.
 */
export const MAX_VIDEOS_PER_EVENT = 60;

/** El navegador ya comprime; esto es la red de seguridad del servidor. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Treinta segundos a 2,2 Mb/s son unos 9 MB. El margen cubre un clip movido,
 *  que es el que peor comprime, sin dejar pasar un original de 4K sin tocar. */
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/** Lo máximo que puede llegar por cualquiera de las dos vías. Lo usa el
 *  controlador local de desarrollo, que recibe el archivo de verdad. */
export const MAX_UPLOAD_BYTES = Math.max(MAX_PHOTO_BYTES, MAX_VIDEO_BYTES);

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Solo dos contenedores: los dos que sabe grabar un navegador y reproducir
 *  cualquier teléfono. Aceptar .mov obligaría a recodificar en el servidor. */
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
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
  evento?: string;
  slug?: string;
}): Promise<UploadContext> {
  if (source.slug && source.evento) {
    const invitation = await prisma.invitation.findFirst({
      where: { slug: source.slug, event: { slug: source.evento } },
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

  const isVideo = input.kind === "VIDEO";

  if (isVideo) {
    if (!ALLOWED_VIDEO_TYPES.includes(input.contentType as (typeof ALLOWED_VIDEO_TYPES)[number])) {
      throw new ServiceError("Solo se aceptan videos MP4 o WebM", 415);
    }
    if (input.bytes > MAX_VIDEO_BYTES) {
      throw new ServiceError("El video pesa demasiado", 413);
    }
  } else {
    if (!ALLOWED_TYPES.includes(input.contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new ServiceError("Solo se aceptan imágenes JPG, PNG o WebP", 415);
    }
    if (input.bytes > MAX_PHOTO_BYTES) {
      throw new ServiceError("La foto pesa demasiado", 413);
    }
  }

  // Cupos separados: ver MAX_VIDEOS_PER_EVENT.
  const count = await prisma.photo.count({
    where: { eventId: context.event.id, kind: isVideo ? "VIDEO" : "PHOTO" },
  });
  const limit = isVideo ? MAX_VIDEOS_PER_EVENT : MAX_PHOTOS_PER_EVENT;
  if (count >= limit) {
    throw new ServiceError(
      isVideo
        ? `Este evento alcanzó el máximo de ${MAX_VIDEOS_PER_EVENT} videos.`
        : `Este evento alcanzó el máximo de ${MAX_PHOTOS_PER_EVENT} fotos.`,
      409
    );
  }

  // El nombre lleva un identificador aleatorio: la URL pública no se puede
  // adivinar, que es el mismo trato que tienen los slugs de invitación.
  const id = crypto.randomUUID();
  const path = mediaPath(
    context.event.id,
    isVideo ? "videos" : "fotos",
    `${id}.${EXTENSIONS[input.contentType]}`
  );
  const target = await storage().createUpload(path, input.contentType);

  // Un video sube dos archivos: el clip y su portada. Se firman los dos de una
  // vez para no obligar al invitado a una segunda ida y vuelta a mitad de la
  // subida, que en la red de una fiesta es donde se pierden las cosas.
  const poster = isVideo
    ? await (async () => {
        // Mismo uuid que su clip, otra carpeta: se emparejan sin guardar nada.
        const posterPath = mediaPath(context.event.id, "portadas", `${id}.jpg`);
        return { path: posterPath, target: await storage().createUpload(posterPath, "image/jpeg") };
      })()
    : null;

  return { path, target, poster };
}

/** Da de alta la foto una vez que el archivo ya está arriba. */
export async function registerPhoto(context: UploadContext, input: RegisterPhotoInput) {
  if (!context.event.photosEnabled) {
    throw new ServiceError("El anfitrión cerró la subida de fotos de este evento", 409);
  }

  // La ruta tiene que ser una que hayamos firmado nosotros para este evento: si
  // no, cualquiera podría colgar del evento un archivo ajeno del bucket.
  if (!belongsToEvent(input.path, context.event.id)) {
    throw new ServiceError("La ruta de la foto no corresponde a este evento", 400);
  }

  // El nombre del invitado manda sobre lo que llegue en el cuerpo: quien entra
  // con su enlace no puede firmar con el nombre de otro.
  const authorName = context.invitation?.guestName ?? input.authorName?.trim();
  if (!authorName) {
    throw new ServiceError("Escribe tu nombre para subir la foto", 400);
  }

  // La portada viaja con el clip y se comprueba igual que él: es otro archivo
  // del bucket y sin esto se podría apuntar a uno ajeno.
  if (input.posterPath && !belongsToEvent(input.posterPath, context.event.id)) {
    throw new ServiceError("La ruta de la portada no corresponde a este evento", 400);
  }

  return prisma.photo.create({
    data: {
      eventId: context.event.id,
      invitationId: context.invitation?.id ?? null,
      authorName: authorName.slice(0, 80),
      kind: input.kind ?? "PHOTO",
      storagePath: input.path,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      posterPath: input.posterPath ?? null,
      durationMs: input.durationMs ?? null,
      caption: input.caption?.trim() || null,
    },
  });
}

export type PhotoRecord = Awaited<ReturnType<typeof listPhotos>>[number];

/**
 * Fotos de un evento. `includeHidden` solo lo pone el panel: la galería pública
 * nunca ve lo que el anfitrión ocultó.
 *
 * Filtra por tipo a propósito. Fotos y videos comparten tabla pero no se
 * enseñan juntos —una cuadrícula de fotos y un carrete de clips son dos
 * componentes distintos—, y así ninguna de las pantallas que ya existían tuvo
 * que enterarse de que ahora hay videos.
 */
export async function listPhotos(eventId: string, includeHidden = false) {
  return prisma.photo.findMany({
    where: { eventId, kind: "PHOTO", ...(includeHidden ? {} : { hiddenAt: null }) },
    orderBy: { createdAt: "desc" },
  });
}

/** Los videos del evento, misma regla. */
export async function listClips(eventId: string, includeHidden = false) {
  return prisma.photo.findMany({
    where: { eventId, kind: "VIDEO", ...(includeHidden ? {} : { hiddenAt: null }) },
    orderBy: { createdAt: "desc" },
  });
}

/** Números del evento para el recuerdo y para el panel. */
export async function photoStats(eventId: string) {
  const [total, hidden, authors, videos, hiddenVideos] = await Promise.all([
    prisma.photo.count({ where: { eventId, kind: "PHOTO" } }),
    prisma.photo.count({ where: { eventId, kind: "PHOTO", hiddenAt: { not: null } } }),
    // Quién más subió cuenta fotos Y videos: es "quien más aportó a la noche",
    // y separar ahí no significaría nada para el anfitrión.
    prisma.photo.groupBy({
      by: ["authorName"],
      where: { eventId, hiddenAt: null },
      _count: { authorName: true },
      orderBy: { _count: { authorName: "desc" } },
      take: 5,
    }),
    prisma.photo.count({ where: { eventId, kind: "VIDEO" } }),
    prisma.photo.count({ where: { eventId, kind: "VIDEO", hiddenAt: { not: null } } }),
  ]);

  return {
    total,
    hidden,
    visible: total - hidden,
    videos,
    hiddenVideos,
    visibleVideos: videos - hiddenVideos,
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
  await storage().remove([photo.storagePath, ...(photo.posterPath ? [photo.posterPath] : [])]);
}

/** URL pública de una foto. Vive aquí para que el panel no importe storage. */
export function photoUrl(storagePath: string): string {
  return storage().publicUrl(storagePath);
}
