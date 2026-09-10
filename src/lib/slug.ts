/**
 * El slug de una invitación: su URL pública y, a la vez, su secreto.
 *
 * Todo el modelo de seguridad de las rutas públicas —ver la invitación,
 * confirmar asistencia, subir fotos firmando con el nombre del invitado— se
 * apoya en que **hay que conocer el enlace**. No hay contraseña detrás: quien
 * tiene la URL es el invitado.
 *
 * Por eso el slug lleva un remate aleatorio y no un contador. La primera
 * versión era `slugify(nombre)` con `-2`, `-3` para repetidos, y eso significaba
 * que `maria-garcia` era adivinable a la primera: recorriendo una lista de
 * nombres comunes se podía abrir la invitación de un desconocido, leer su
 * mensaje personal y, peor, sobrescribir su respuesta. Con 7 símbolos de un
 * alfabeto de 32 hay 34 mil millones de combinaciones por nombre.
 *
 * Agrupar las invitaciones por evento (/e/[evento]/i/[slug]) no quita esa
 * necesidad, solo cambia quién adivina: el que ya tiene su enlace conoce el
 * evento y le quedaría por probar únicamente los nombres de los demás
 * invitados, que son justo los que conoce. El remate es lo que lo impide.
 *
 * La parte legible se conserva a propósito: el nombre del invitado en la URL es
 * parte de la experiencia —se ve al compartir por WhatsApp— y no es un secreto,
 * porque quien recibe el enlace ya sabe cómo se llama.
 */

/** Mismo alfabeto que share-code.ts: 32 símbolos, sin 0/1/l/o. */
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/** Longitud del remate aleatorio. 7 × 5 bits = 35 bits. */
export const SLUG_TOKEN_LENGTH = 7;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Remate aleatorio del slug.
 *
 * 256 es múltiplo de 32, así que el resto no favorece a ninguna letra; con otro
 * tamaño de alfabeto habría que descartar bytes para no sesgar el sorteo.
 */
export function slugToken(length: number = SLUG_TOKEN_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let token = "";
  for (const byte of bytes) {
    token += ALPHABET[byte % ALPHABET.length];
  }
  return token;
}

/**
 * Un slug nuevo, único frente a los ya ocupados.
 *
 * `taken` sigue haciendo falta aunque el remate sea aleatorio: no para evitar
 * nombres repetidos —eso ya lo resuelve el azar— sino porque una colisión, por
 * improbable que sea, haría que dos invitados compartieran invitación. Se
 * reintenta hasta encontrar uno libre.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || "invitado";
  const used = new Set(taken);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `${root}-${slugToken()}`;
    if (!used.has(candidate)) return candidate;
  }

  // Ocho colisiones seguidas con 35 bits cada una no pasa; si pasara, se alarga
  // el remate en vez de devolver algo repetido.
  return `${root}-${slugToken(SLUG_TOKEN_LENGTH + 4)}`;
}

/* ─────────────────────────── Slug del evento ─────────────────────────── */

/**
 * Slug de un evento: la primera mitad de la ruta pública, /e/[evento]/i/[…].
 *
 * Aquí NO hay remate aleatorio, y es a propósito. El slug del evento no protege
 * nada: quien lo adivina llega a una ruta que no existe, porque sin la parte de
 * invitado no hay página. Lo que sí hace es decirle al invitado de qué fiesta
 * es el enlace que acaba de recibir, y para eso tiene que leerse.
 *
 * Los repetidos se numeran. Dos "XV de Sofía" son perfectamente normales —el
 * mismo nombre se repite cada año y entre clientes distintos—, así que el
 * segundo es `xv-de-sofia-2`.
 */
export function eventSlug(name: string, taken: Iterable<string>): string {
  const root = slugify(name) || "evento";
  const used = new Set(taken);

  if (!used.has(root)) return root;

  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }

  // Quinientos eventos con el mismo nombre no pasa; si pasara, vale más un slug
  // feo que un error al crear el evento.
  return `${root}-${slugToken(5)}`;
}

/**
 * ¿Vale como slug de evento escrito a mano?
 *
 * El anfitrión puede cambiarlo desde el panel, y ahí sí llega texto libre: sin
 * esto, un slug con "/" o con espacios partiría la ruta.
 */
export function isEventSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 60;
}

/**
 * ¿Tiene forma de slug con remate aleatorio?
 *
 * Sirve para saber qué invitaciones se crearon antes de este cambio y siguen
 * teniendo un slug adivinable: ver scripts/rotar-slugs.ts.
 */
export function hasRandomToken(slug: string): boolean {
  const token = slug.split("-").at(-1) ?? "";
  return (
    token.length >= SLUG_TOKEN_LENGTH && [...token].every((char) => ALPHABET.includes(char))
  );
}
