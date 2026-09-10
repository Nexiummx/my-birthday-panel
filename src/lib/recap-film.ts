/**
 * La línea de tiempo del video para redes.
 *
 * Está aparte del dibujo y sin una sola referencia al DOM porque es donde se
 * decide lo único que no se puede corregir después: cuánto dura cada plano y en
 * qué orden van. Grabar el video cuesta lo que dura el video, así que un error
 * de ritmo no se descubre en un segundo — se descubre veinticinco segundos
 * después. Aquí sí se puede comprobar en un test.
 *
 * Un plano es una escena con su hueco en el tiempo. Nada se solapa: cada uno
 * entra desde el fondo y sale hacia el fondo, y esa disolución por el color del
 * tema es lo que hace que el conjunto parezca una pieza y no un pase de
 * diapositivas.
 */

export type RecapScene =
  | { kind: "title"; title: string; highlight: string | null; dateLabel: string }
  | { kind: "stat"; eyebrow: string; value: number; unit: string }
  | { kind: "photo"; url: string; caption: string | null; author: string }
  | { kind: "collage"; urls: string[] }
  | { kind: "quote"; text: string; author: string }
  | { kind: "end"; title: string; note: string };

export interface RecapShot {
  scene: RecapScene;
  /** Segundo en el que empieza dentro del video. */
  start: number;
  duration: number;
}

export interface RecapFilm {
  shots: RecapShot[];
  seconds: number;
}

/**
 * Formatos de salida. Los tres que de verdad se publican, con el nombre por el
 * que los conoce quien va a publicarlos.
 */
export const RECAP_FORMATS = {
  historia: { id: "historia", label: "Historia", ratio: "9:16", width: 1080, height: 1920 },
  publicacion: { id: "publicacion", label: "Publicación", ratio: "4:5", width: 1080, height: 1350 },
  cuadrado: { id: "cuadrado", label: "Cuadrado", ratio: "1:1", width: 1080, height: 1080 },
} as const;

export type RecapFormatId = keyof typeof RECAP_FORMATS;
export type RecapFormat = (typeof RECAP_FORMATS)[RecapFormatId];

export const RECAP_FORMAT_LIST: RecapFormat[] = [
  RECAP_FORMATS.historia,
  RECAP_FORMATS.publicacion,
  RECAP_FORMATS.cuadrado,
];

/** Cuánto dura cada tipo de plano. Lo que se lee necesita más que lo que se ve. */
function durationOf(scene: RecapScene): number {
  switch (scene.kind) {
    case "title":
      return 3.4;
    case "stat":
      return 2.4;
    case "photo":
      return 2.8;
    case "collage":
      return 3.2;
    case "quote":
      // Un mensaje largo no se lee en dos segundos y medio. Se paga por
      // carácter, con techo: nadie va a poner un párrafo en una story.
      return Math.min(3.2 + scene.text.length / 45, 6);
    case "end":
      return 3.2;
  }
}

/**
 * Tope duro. Una historia de Instagram se corta a los 60 s y una publicación
 * larga no se ve entera; además cada segundo de más es un segundo más de espera
 * al generarlo. Si sobran planos se recortan por el final, nunca por el
 * principio: el remate cierra y el título abre.
 */
export const MAX_RECAP_SECONDS = 32;

/**
 * Cuánto tarda un plano en aparecer y en irse.
 *
 * Corto a propósito. Con planos de 2,4 s, un fundido de 0,42 s a cada lado se
 * comía un tercio del plano y dos escenas seguidas se leían como una sola
 * mezclada. Además se limita a un 18 % del plano, para que un plano corto no
 * sea puro fundido.
 */
export const FADE_SECONDS = 0.3;
const FADE_MAX_SHARE = 0.18;

export function planFilm(scenes: RecapScene[]): RecapFilm {
  const shots: RecapShot[] = [];
  let cursor = 0;

  // El cierre se reserva antes de repartir: es el plano que no puede faltar,
  // porque es el que lleva el nombre y el enlace.
  const closing = scenes.at(-1)?.kind === "end" ? scenes.at(-1)! : null;
  const body = closing ? scenes.slice(0, -1) : scenes;
  const reserved = closing ? durationOf(closing) : 0;

  for (const scene of body) {
    const duration = durationOf(scene);
    if (cursor + duration + reserved > MAX_RECAP_SECONDS) break;
    shots.push({ scene, start: cursor, duration });
    cursor += duration;
  }

  if (closing) {
    shots.push({ scene: closing, start: cursor, duration: reserved });
    cursor += reserved;
  }

  return { shots, seconds: cursor };
}

/** El plano que toca en el segundo `t`, con su tiempo local y su avance 0–1. */
export function shotAt(
  film: RecapFilm,
  t: number
): { shot: RecapShot; local: number; progress: number } | null {
  for (const shot of film.shots) {
    if (t >= shot.start && t < shot.start + shot.duration) {
      const local = t - shot.start;
      return { shot, local, progress: local / shot.duration };
    }
  }
  // Justo en el último fotograma: se devuelve el plano final completo en vez de
  // nada, que dejaría el video acabando en un fundido a negro sin motivo.
  const last = film.shots.at(-1);
  if (last && t >= last.start) {
    return { shot: last, local: last.duration, progress: 1 };
  }
  return null;
}

/** Opacidad del plano: entra, se queda, sale. */
export function fadeAt(local: number, duration: number): number {
  const fade = Math.min(FADE_SECONDS, duration * FADE_MAX_SHARE);
  if (local < fade) return local / fade;
  if (local > duration - fade) return Math.max(0, (duration - local) / fade);
  return 1;
}

/** Suavizado de entrada. Sale de cero, llega a uno y frena. */
export function easeOut(x: number): number {
  const clamped = Math.min(Math.max(x, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}
