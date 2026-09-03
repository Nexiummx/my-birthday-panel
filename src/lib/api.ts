import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError } from "@/lib/auth";
import { ServiceError } from "@/lib/services/invitations";

/** Respuesta correcta uniforme: { data }. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** Respuesta de error uniforme: { error, issues? }. */
export function fail(error: string, status = 400, issues?: Record<string, string[]>) {
  return NextResponse.json({ error, issues }, { status });
}

/**
 * Traduce cualquier excepción en una respuesta HTTP segura.
 * Nunca expone mensajes internos de la base de datos al cliente.
 */
export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return fail("Necesitas iniciar sesión", 401);
  }

  if (error instanceof ServiceError) {
    return fail(error.message, error.status);
  }

  if (error instanceof z.ZodError) {
    return fail("Datos inválidos", 422, z.flattenError(error).fieldErrors as Record<string, string[]>);
  }

  console.error("[api] error no controlado:", error);
  return fail("Ocurrió un error inesperado", 500);
}

/** Lee y valida el cuerpo JSON de una petición con un esquema Zod. */
export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema
): Promise<z.infer<Schema>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ServiceError("El cuerpo de la petición no es JSON válido", 400);
  }
  return schema.parse(raw);
}
