import { handleError, ok, parseBody , tooMany } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { createUploadTicket, resolveUploadContext } from "@/lib/services/photos";
import { signPhotoSchema } from "@/lib/validations";

/**
 * Paso 1 de la subida: autoriza y dice a dónde mandar el archivo.
 *
 * Es pública porque la usan los invitados, que no tienen cuenta. Lo que la
 * protege es lo mismo que protege una invitación: hay que conocer el enlace.
 * Los topes —tipo, tamaño y fotos por evento— se comprueban en el servicio.
 */
export async function POST(request: Request) {
  try {
    // Ruta pública: sin tope, probar enlaces sale gratis. Ver lib/rate-limit.ts.
    const limite = await rateLimit("subida", request, LIMITS.subida.max, LIMITS.subida.windowMs);
    if (!limite.ok) return tooMany(limite.retryAfter);

    const input = await parseBody(request, signPhotoSchema);
    const context = await resolveUploadContext(input);
    return ok(await createUploadTicket(context, input));
  } catch (error) {
    return handleError(error);
  }
}
