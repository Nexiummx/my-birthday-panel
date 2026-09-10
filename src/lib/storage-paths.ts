import "server-only";

/**
 * Dónde vive cada archivo dentro del bucket.
 *
 * Un solo módulo construye TODAS las rutas. Antes se armaban a mano en tres
 * sitios y el tipo de archivo se deducía del nombre —una portada era la que
 * terminaba en "-portada.jpg"—, que es el peor lugar posible para guardar esa
 * información: no se puede listar, no se puede filtrar y una errata la rompe
 * en silencio.
 *
 * El orden es:
 *
 *   <entorno>/eventos/<eventId>/fotos/<uuid>.jpg
 *   <entorno>/eventos/<eventId>/videos/<uuid>.mp4
 *   <entorno>/eventos/<eventId>/portadas/<uuid>.jpg
 *   <entorno>/eventos/<eventId>/musica/<uuid>.mp3
 *
 * Y cada tramo está por una razón concreta:
 *
 * `<entorno>` separa producción de los despliegues de vista previa. En Vercel
 * las variables se copian a los previews con toda naturalidad, así que sin este
 * prefijo las pruebas de un preview acabarían escribiendo en el mismo sitio que
 * la fiesta de un cliente. Además hace que limpiar sea "borra todo lo que
 * cuelgue de preview/", en vez de una arqueología.
 *
 * `<eventId>` y no el código público ni el slug del evento. Los dos son
 * legibles y los dos pueden cambiar —el código se puede rotar y el slug lo
 * edita el anfitrión desde el panel—, y una ruta de almacenamiento que cambia
 * deja huérfano todo lo subido. El id es el único identificador inmutable que
 * tiene un evento. Que aparezca en la URL pública de una foto no da acceso a
 * nada: el panel filtra por dueño de la sesión, no por id.
 *
 * `fotos/ videos/ portadas/ musica/` es lo que de verdad cambia el día a día:
 * cuánto ocupa el video de un cliente, qué se puede caducar antes, qué borrar
 * cuando el anfitrión cierra las fotos. Todo eso pasa de cruzar la base a mirar
 * una carpeta.
 *
 * La portada de un clip comparte uuid con su video y solo cambia de carpeta, así
 * que se emparejan sin guardar la relación en ningún sitio. Y siempre es .jpg.
 *
 * Cambiar este orden NO obliga a mover nada: la ruta de cada archivo vive en su
 * fila (`storagePath`, `posterPath`, `soundtrackPath`), así que lo viejo se
 * sigue sirviendo donde está y solo lo nuevo estrena sitio.
 */

/** Las carpetas que hay dentro de un evento. Una por tipo de archivo. */
export const STORAGE_AREAS = ["fotos", "videos", "portadas", "musica"] as const;
export type StorageArea = (typeof STORAGE_AREAS)[number];

/** Raíz común. Deja sitio para colgar del bucket cosas que no sean de eventos. */
const RAIZ = "eventos";

/**
 * Prefijo del entorno.
 *
 * `VERCEL_ENV` lo pone Vercel solo y vale "production", "preview" o
 * "development". STORAGE_PREFIX permite forzarlo cuando haga falta —dos
 * entornos compartiendo bucket a propósito, por ejemplo—.
 */
export function storagePrefix(): string {
  const forzado = process.env.STORAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  if (forzado) return forzado;

  switch (process.env.VERCEL_ENV) {
    case "production":
      return "prod";
    case "preview":
      return "preview";
    default:
      return "dev";
  }
}

/** Todo lo de un evento cuelga de aquí. */
export function eventFolder(eventId: string): string {
  return `${storagePrefix()}/${RAIZ}/${eventId}`;
}

/** Ruta de un archivo concreto. `name` ya trae su extensión. */
export function mediaPath(eventId: string, area: StorageArea, name: string): string {
  return `${eventFolder(eventId)}/${area}/${name}`;
}

/**
 * ¿Esta ruta es de este evento?
 *
 * Es una comprobación de seguridad, no de orden: sin ella se podría registrar
 * en un evento un archivo del bucket que pertenece a otro. Se llama con la ruta
 * que devuelve el cliente después de subir, que es dato de fuera.
 *
 * Acepta también el orden anterior (`eventos/<id>/…`, sin prefijo de entorno)
 * a propósito. Durante un despliegue puede haber una subida a medio camino:
 * firmada por el código viejo y registrada por el nuevo. Sigue estando acotada
 * al mismo evento, que es lo único que esta función promete.
 */
export function belongsToEvent(path: string, eventId: string): boolean {
  // Una ruta con ".." podría escaparse del prefijo al normalizarse aguas abajo.
  if (path.includes("..")) return false;

  return (
    path.startsWith(`${eventFolder(eventId)}/`) || path.startsWith(`${RAIZ}/${eventId}/`)
  );
}
