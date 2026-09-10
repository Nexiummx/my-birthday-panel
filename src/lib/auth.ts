import "server-only";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import type { SessionPayload } from "@/lib/session";

/**
 * Fachada de sesión.
 *
 * Better Auth es quien autentica, pero el resto de la aplicación sigue viendo
 * el mismo `{ sub, email }` de antes. Ese contrato es lo que permitió cambiar
 * de motor sin tocar los trece archivos que dependen de la sesión.
 */

/**
 * Hash de contraseña. Sigue siendo bcrypt, y la configuración de Better Auth
 * usa el mismo algoritmo: así las cuentas anteriores a la migración siguen
 * entrando con su contraseña de siempre.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sesión actual, o null si no hay ninguna válida. */
export async function getSession(): Promise<SessionPayload | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { sub: session.user.id, email: session.user.email, token: session.session?.token };
}

/** Lanza si no hay sesión: lo usan los route handlers del panel. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("No autorizado");
    this.name = "UnauthorizedError";
  }
}
