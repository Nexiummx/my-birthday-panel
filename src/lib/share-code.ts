/**
 * Código público de un evento: la puerta de /f/[code] (subir fotos, el QR de
 * las mesas) y /r/[code] (el recuerdo).
 *
 * No es el id del evento a propósito. El id viaja por las rutas del panel y
 * aparece en mensajes de error; el código puede ir impreso en una mesa y
 * cambiarse si hace falta, sin tocar nada más.
 *
 * El alfabeto tiene exactamente 32 símbolos, sin 0/1/l/o, por dos razones: se
 * puede dictar por teléfono sin confusiones, y como 256 es múltiplo de 32 el
 * resto no favorece a ninguna letra. Con otro tamaño de alfabeto habría que
 * descartar bytes para no sesgar el sorteo.
 */
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

export const SHARE_CODE_LENGTH = 10;

export function newShareCode(length: number = SHARE_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

/** ¿Tiene forma de código? Evita ir a la base con basura de la URL. */
export function isShareCode(value: string): boolean {
  return value.length === SHARE_CODE_LENGTH && [...value].every((c) => ALPHABET.includes(c));
}
