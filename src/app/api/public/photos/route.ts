import { handleError, ok, parseBody , tooMany } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { registerPhoto, resolveUploadContext } from "@/lib/services/photos";
import { registerPhotoSchema } from "@/lib/validations";

/** Paso 2: el archivo ya está arriba, se da de alta la foto. */
export async function POST(request: Request) {
  try {
    // Ruta pública: sin tope, probar enlaces sale gratis. Ver lib/rate-limit.ts.
    const limite = await rateLimit("subida", request, LIMITS.subida.max, LIMITS.subida.windowMs);
    if (!limite.ok) return tooMany(limite.retryAfter);

    const input = await parseBody(request, registerPhotoSchema);
    const context = await resolveUploadContext(input);
    const photo = await registerPhoto(context, input);
    return ok({ id: photo.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}
