import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de campos sueltos en reposo.
 *
 * Protege contra **una cosa concreta**: que alguien se lleve el volcado de
 * Postgres. No protege contra quien ya entró a la aplicación con una sesión
 * válida —el servidor tiene que descifrar para enseñarle sus datos al dueño— ni
 * contra quien tiene el enlace de una invitación. Decirlo importa: cifrar da
 * una sensación de seguridad que no siempre corresponde a lo que hace.
 *
 * Qué se cifra y por qué:
 *
 *   phone            El teléfono de un tercero. El invitado nunca nos lo dio a
 *                    nosotros: lo entregó el anfitrión. En México una fuga de
 *                    números no es teórica.
 *   personalMessage  Lo que el anfitrión le escribió a esa persona.
 *   comment          Lo que el invitado contestó. En bloque, miles de "no puedo,
 *                    ando fuera de la ciudad" son una lista de quién no va a
 *                    estar en su casa tal noche.
 *
 * Qué NO se cifra, con su razón:
 *
 *   guestName        Ya es público por diseño: va en la URL de la invitación y
 *                    en la miniatura de WhatsApp. Cifrarlo en la base no reduce
 *                    ningún riesgo real y rompería el orden del CSV.
 *   email del titular  Es la llave de acceso: Better Auth lo busca en cada
 *                    intento de entrada. Cifrarlo obligaría a un índice ciego
 *                    solo para poder iniciar sesión.
 *   password         Ya está protegido con lo correcto, que es un hash de un
 *                    solo sentido. Cifrar un hash no añade nada: el cifrado es
 *                    reversible por definición, y el hash no.
 *
 * ## Sin clave configurada no cifra nada
 *
 * Es deliberado. Permite desplegar el código antes de generar la clave, y que
 * quien clone el repositorio trabaje sin ceremonias. En cuanto existe
 * FIELD_ENCRYPTION_KEY_V1, todo lo que se escriba sale cifrado y lo viejo se
 * sigue leyendo igual hasta que pase el script de migración.
 *
 * Formato guardado: "v1:<iv_b64>:<tag_b64>:<datos_b64>"
 *
 * El prefijo de versión no es adorno: dice con qué clave descifrar. El día que
 * haya que rotar, se añade FIELD_ENCRYPTION_KEY_V2, CURRENT_VERSION pasa a
 * "v2", y las filas viejas se siguen leyendo sin migrar nada de golpe.
 */

/**
 * Solo servidor, comprobado en ejecución y no con el centinela `server-only`.
 *
 * El centinela habría impedido usar este módulo desde los scripts de mantenimiento
 * —el que cifra los datos que ya existían— y desde las pruebas, que es donde más
 * falta hace poder probarlo. Esta comprobación cubre lo mismo y encima es real:
 * si alguien lo importa por error en un componente de cliente, revienta al
 * cargarse en el navegador en vez de cifrar en silencio con una clave vacía.
 */
if (typeof window !== "undefined") {
  throw new Error("field-crypto solo puede usarse en el servidor.");
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const CURRENT_VERSION = "v1";

/** Cuatro segmentos separados por ":". Distingue lo cifrado del texto plano. */
const ENVELOPE = /^v(\d+):([A-Za-z0-9+/]+=*):([A-Za-z0-9+/]+=*):([A-Za-z0-9+/]*=*)$/;

function keyFor(version: string): Buffer | null {
  const secret = process.env[`FIELD_ENCRYPTION_KEY_${version.toUpperCase()}`];
  if (!secret) return null;

  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY_${version.toUpperCase()} debe decodificar a 32 bytes (AES-256). Genérala con: openssl rand -base64 32`
    );
  }
  return key;
}

/** ¿Está activo el cifrado en este entorno? */
export function encryptionEnabled(): boolean {
  return keyFor(CURRENT_VERSION) !== null;
}

export function isEncrypted(value: string): boolean {
  return ENVELOPE.test(value);
}

export function encryptField(plaintext: string): string {
  const key = keyFor(CURRENT_VERSION);
  // Sin clave se guarda tal cual. Ver la nota del encabezado.
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    CURRENT_VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptField(stored: string): string {
  const match = ENVELOPE.exec(stored);
  // No tiene forma de sobre cifrado: es texto de antes de activar el cifrado, o
  // de una fila que el backfill todavía no tocó. Se devuelve tal cual, que es
  // lo que hace que la migración no tenga que ser atómica.
  if (!match) return stored;

  const [, version, ivB64, tagB64, dataB64] = match;
  const key = keyFor(`v${version}`);
  if (!key) {
    throw new Error(
      `Hay datos cifrados con la versión v${version} y falta FIELD_ENCRYPTION_KEY_V${version}.`
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  // El tag se verifica al hacer final(): si alguien tocó el dato en la base, o
  // la clave no es la correcta, lanza en vez de devolver basura en silencio.
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/* Variantes para los campos que normalmente están vacíos, que son todos. */

export function encryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return encryptField(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return decryptField(value);
}
