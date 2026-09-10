import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Límite de peticiones para las rutas públicas.
 *
 * Better Auth ya limitaba sus propias rutas de acceso, pero las nuestras —RSVP,
 * ver una invitación, subir fotos— estaban abiertas de par en par. Eso importa
 * porque el modelo de seguridad de todas ellas es "el secreto es el enlace": sin
 * un tope, probar enlaces sale gratis y a miles por minuto. Con tope, un ataque
 * por fuerza bruta deja de ser práctico aunque el enlace fuera corto.
 *
 * El contador vive en la base y no en memoria a propósito, por la misma razón
 * que ya documenta el modelo `RateLimit`: en un despliegue sin servidor cada
 * instancia tiene su propia memoria, así que un contador en RAM no limita casi
 * nada.
 *
 * No es un candado: dos peticiones simultáneas pueden leer el mismo contador y
 * colarse las dos. Da igual —esto existe para frenar a un script que prueba
 * cien mil combinaciones, no para contar con precisión de banco— y un candado
 * de verdad costaría una transacción por petición pública.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Segundos que faltan para que se abra la ventana. Va en Retry-After. */
  retryAfter: number;
}

/**
 * Quién está pidiendo. En Vercel la IP real llega en `x-forwarded-for`; el
 * primer valor es el cliente y el resto son los proxies por los que pasó.
 *
 * Sin cabecera se usa una clave común: prefiero que un entorno raro limite de
 * más a que se quede sin límite.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded?.split(",")[0] ?? real ?? "sin-ip").trim().slice(0, 60);
}

export async function rateLimit(
  bucket: string,
  request: Request,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `${bucket}:${clientKey(request)}`;
  const now = Date.now();

  try {
    const row = await prisma.rateLimit.findFirst({ where: { key } });

    if (!row || !row.lastRequest || now - Number(row.lastRequest) > windowMs) {
      // Ventana nueva. upsert no sirve: `key` no es único en el esquema, que lo
      // define Better Auth y no podemos cambiar sin migrar su tabla.
      if (row) {
        await prisma.rateLimit.update({
          where: { id: row.id },
          data: { count: 1, lastRequest: BigInt(now) },
        });
      } else {
        await prisma.rateLimit.create({ data: { key, count: 1, lastRequest: BigInt(now) } });
      }
      return { ok: true, retryAfter: 0 };
    }

    const count = (row.count ?? 0) + 1;
    await prisma.rateLimit.update({ where: { id: row.id }, data: { count } });

    if (count > max) {
      const elapsed = now - Number(row.lastRequest);
      return { ok: false, retryAfter: Math.ceil((windowMs - elapsed) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    // Si la base falla, no se bloquea a nadie: dejar sin confirmar asistencia a
    // los invitados de una fiesta real es peor que no limitar durante un rato.
    return { ok: true, retryAfter: 0 };
  }
}

/** Cuotas por ruta. Generosas para una persona, cortas para un script. */
export const LIMITS = {
  /** Confirmar asistencia. Un invitado lo hace una vez y quizá lo corrige. */
  rsvp: { max: 20, windowMs: 60_000 },
  /** Abrir una invitación. Una familia detrás de la misma IP cabe de sobra. */
  invitacion: { max: 120, windowMs: 60_000 },
  /** Pedir permiso para subir. Una tanda de fotos son varias seguidas. */
  subida: { max: 90, windowMs: 60_000 },
} as const;
