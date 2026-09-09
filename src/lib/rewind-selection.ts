/**
 * Cómo se decide qué sale en el recuerdo.
 *
 * La regla es una sola y vale igual para fotos y para mensajes:
 *
 *   Si NADIE tiene posición asignada → la elige el sistema.
 *   Si ALGUNA la tiene              → salen solo esas, en ese orden.
 *
 * Es lo que permite que el recuerdo funcione sin que el anfitrión toque nada
 * —que es el caso normal— y que, en cuanto quiera mandar, no tenga que
 * descartar cincuenta fotos una por una para quedarse con seis.
 *
 * Vive fuera de los servicios y sin dependencias para poder probarse: es una
 * regla de producto, y equivocarse aquí significa enseñar en el recuerdo una
 * foto que el anfitrión quitó.
 */

export interface Curable {
  rewindOrder: number | null;
}

/** Qué eligió el anfitrión, o null si dejó que decidiéramos nosotros. */
export function curatedSelection<T extends Curable>(items: T[]): T[] | null {
  const chosen = items.filter((item) => item.rewindOrder !== null);
  if (chosen.length === 0) return null;

  // El orden lo da rewindOrder; el desempate, el orden de llegada, para que dos
  // posiciones iguales por un guardado a medias no barajen la lista al azar.
  return [...chosen].sort((a, b) => (a.rewindOrder ?? 0) - (b.rewindOrder ?? 0));
}

/**
 * La selección del anfitrión si existe; si no, la automática.
 * `automatic` se evalúa solo cuando hace falta.
 */
export function selectForRewind<T extends Curable>(items: T[], automatic: () => T[]): T[] {
  return curatedSelection(items) ?? automatic();
}

/**
 * Reordena una lista de ids a posiciones consecutivas desde 1.
 *
 * Se guardan compactas y no con los huecos que deje quitar una: así el número
 * que ve el anfitrión ("3 de 8") es el mismo que hay en la base, y el orden no
 * depende de cuántas veces se haya editado.
 */
export function positionsFor(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, index) => [id, index + 1]));
}
