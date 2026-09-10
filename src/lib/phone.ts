/**
 * Teléfonos para enlaces de WhatsApp.
 *
 * El anfitrión escribe el número como lo tiene en la agenda: "55 1234 5678",
 * "(618) 123-4567", "+52 1 618 123 4567". wa.me solo acepta dígitos con lada de
 * país, así que hay que traducir — pero **nunca reescribimos lo que él guardó**:
 * si corrigiéramos su dato, no podría arreglar un número que él ve bien y
 * nosotros interpretamos mal.
 *
 * El país por defecto es México porque es el mercado del producto. Un número
 * que ya trae lada —empieza por + o tiene más de 10 dígitos— se respeta.
 */

/** Lada por defecto cuando el número viene "a secas". */
export const DEFAULT_COUNTRY_CODE = "52";

/** Longitud de un número nacional mexicano, sin lada. */
const NATIONAL_LENGTH = 10;

export interface PhoneResult {
  /** Solo dígitos, listo para wa.me. null si no hay número usable. */
  wa: string | null;
  /** Por qué no se pudo, para poder decírselo al anfitrión. */
  problem: "vacio" | "corto" | "largo" | null;
}

export function toWhatsApp(raw: string | null | undefined): PhoneResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { wa: null, problem: "vacio" };

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 0) return { wa: null, problem: "vacio" };
  // Menos de diez dígitos no es un móvil: probablemente sea una extensión o un
  // número a medio escribir, y mandar a wa.me algo así abre un chat con nadie.
  if (digits.length < NATIONAL_LENGTH) return { wa: null, problem: "corto" };
  if (digits.length > 15) return { wa: null, problem: "largo" };

  // Nacional a secas: se le antepone la lada del país.
  if (!hadPlus && digits.length === NATIONAL_LENGTH) {
    return { wa: `${DEFAULT_COUNTRY_CODE}${digits}`, problem: null };
  }

  // "+52 1 55…" y "521 55…" son la forma vieja de los móviles mexicanos. El 1
  // sobra desde 2019 y WhatsApp lo acepta igual, así que se deja como está: no
  // es asunto nuestro decidir que su número está anticuado.
  return { wa: digits, problem: null };
}

/** "5215512345678" → "+52 1 55 1234 5678", para enseñarlo en el panel. */
export function formatPhone(raw: string | null | undefined): string | null {
  const { wa } = toWhatsApp(raw);
  if (!wa) return (raw ?? "").trim() || null;

  // Agrupado, no la ristra pegada del enlace. "+526184845834" hay que leerlo
  // dígito a dígito para comprobar que es el número correcto; "+52 618 484 5834"
  // se reconoce de un vistazo, que es justo lo que hace falta en una lista de
  // cincuenta filas.
  const nacional = wa.slice(DEFAULT_COUNTRY_CODE.length);
  const bloques =
    nacional.length === 10
      ? [nacional.slice(0, 3), nacional.slice(3, 6), nacional.slice(6)]
      : nacional.match(/\d{1,4}/g) ?? [nacional];

  return wa.startsWith(DEFAULT_COUNTRY_CODE)
    ? `+${DEFAULT_COUNTRY_CODE} ${bloques.join(" ")}`
    : `+${wa}`;
}

/** Enlace de WhatsApp con el mensaje escrito. Sin número, abre el selector. */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const { wa } = toWhatsApp(phone);
  const text = encodeURIComponent(message);
  // Sin número, wa.me/?text= abre WhatsApp para que el anfitrión elija a quién
  // mandárselo: sigue ahorrándole escribir el mensaje.
  return wa ? `https://wa.me/${wa}?text=${text}` : `https://wa.me/?text=${text}`;
}
