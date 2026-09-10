import { handleError, ok, parseBody , tooMany } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { submitRsvp } from "@/lib/services/rsvp";
import { rsvpSchema } from "@/lib/validations";

/**
 * Registra o actualiza la respuesta de una invitación (upsert).
 * Es público a propósito: el "secreto" es el slug de la invitación.
 */
export async function POST(request: Request) {
  try {
    // Ruta pública: sin tope, probar enlaces sale gratis. Ver lib/rate-limit.ts.
    const limite = await rateLimit("rsvp", request, LIMITS.rsvp.max, LIMITS.rsvp.windowMs);
    if (!limite.ok) return tooMany(limite.retryAfter);

    const input = await parseBody(request, rsvpSchema);
    const { rsvp } = await submitRsvp(input);

    return ok({
      status: rsvp.status,
      guestCount: rsvp.guestCount,
      comment: rsvp.comment,
    });
  } catch (error) {
    return handleError(error);
  }
}
