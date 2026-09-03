import { handleError, ok, parseBody } from "@/lib/api";
import { submitRsvp } from "@/lib/services/rsvp";
import { rsvpSchema } from "@/lib/validations";

/**
 * Registra o actualiza la respuesta de una invitación (upsert).
 * Es público a propósito: el "secreto" es el slug de la invitación.
 */
export async function POST(request: Request) {
  try {
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
