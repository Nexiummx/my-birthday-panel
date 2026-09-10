import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { requireActiveEvent } from "@/lib/services/events";
import { createSoundtrackTicket } from "@/lib/services/soundtrack";
import { signSoundtrackSchema } from "@/lib/validations";

/**
 * Paso 1 de subir la música: autoriza y dice a dónde mandar el archivo.
 *
 * Igual que con las fotos, la canción no pasa por el servidor. Aquí la razón no
 * es solo el límite de Vercel: un MP3 de varios megas subiendo por una función
 * serverless es tiempo de ejecución que se paga sin necesidad.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const input = await parseBody(request, signSoundtrackSchema);
    return ok(await createSoundtrackTicket(event.id, session.sub, input));
  } catch (error) {
    return handleError(error);
  }
}
