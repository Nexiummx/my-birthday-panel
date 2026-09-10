import "server-only";
import type { PhotoRecord } from "@/lib/services/photos";
import { photoUrl } from "@/lib/services/photos";
import { formatDateTime, formatDuration } from "@/lib/utils";

/**
 * Un video ya listo para pintarse.
 *
 * Es un tipo aparte de PublicPhoto y no un campo `kind` dentro de ella. Comparten
 * tabla porque comparten autoría y moderación, pero no se enseñan igual en
 * ningún sitio: una foto es un `<img>` en una columna, un clip es un `<video>`
 * con portada, duración y sonido. Unirlos obligaría a cada componente que hoy
 * pinta fotos a preguntarse si esta en concreto es un video.
 */
export interface PublicClip {
  id: string;
  url: string;
  /** Fotograma de portada. NULL solo en clips subidos antes de que existiera. */
  posterUrl: string | null;
  width: number;
  height: number;
  seconds: number;
  /** "0:23", ya formateado: el componente no debería hacer cuentas. */
  durationLabel: string;
  authorName: string;
  caption: string | null;
  atLabel: string;
  /** Solo lo usa el panel; en la galería pública nunca llega uno oculto. */
  hidden: boolean;
}

export function toPublicClip(clip: PhotoRecord): PublicClip {
  return {
    id: clip.id,
    url: photoUrl(clip.storagePath),
    posterUrl: clip.posterPath ? photoUrl(clip.posterPath) : null,
    width: clip.width,
    height: clip.height,
    seconds: Math.round((clip.durationMs ?? 0) / 1000),
    durationLabel: formatDuration(clip.durationMs),
    authorName: clip.authorName,
    caption: clip.caption,
    atLabel: formatDateTime(clip.createdAt),
    hidden: clip.hiddenAt !== null,
  };
}
