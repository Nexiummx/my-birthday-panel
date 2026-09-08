import "server-only";
import type { PhotoRecord } from "@/lib/services/photos";
import { photoUrl } from "@/lib/services/photos";
import { formatDateTime } from "@/lib/utils";

/** Foto ya lista para pintarse: sin rutas de almacenamiento ni fechas crudas. */
export interface PublicPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  authorName: string;
  caption: string | null;
  atLabel: string;
  /** Solo lo usa el panel; en la galería pública nunca llega una oculta. */
  hidden: boolean;
}

export function toPublicPhoto(photo: PhotoRecord): PublicPhoto {
  return {
    id: photo.id,
    url: photoUrl(photo.storagePath),
    width: photo.width,
    height: photo.height,
    authorName: photo.authorName,
    caption: photo.caption,
    atLabel: formatDateTime(photo.createdAt),
    hidden: photo.hiddenAt !== null,
  };
}
