import { config } from "dotenv";

/**
 * Carga de entorno para las herramientas de línea de comandos (Prisma, seed,
 * alta de cuentas).
 *
 * `.env.local` gana sobre `.env`. Es lo que impide el accidente más caro de
 * este proyecto: que un `prisma migrate` pensado para la base local acabe
 * corriendo contra Supabase porque `.env` es el único archivo que se lee.
 * dotenv no sobrescribe una variable ya definida, así que el orden del array
 * es la precedencia.
 *
 * Next.js ya aplica esta misma precedencia por su cuenta.
 */
config({ path: [".env.local", ".env"] });
