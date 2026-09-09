import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { saveCuration } from "@/lib/services/rewind-curation";
import { requireActiveEvent } from "@/lib/services/events";
import { saveCurationSchema } from "@/lib/validations";

/** Guarda qué fotos y qué mensajes salen en el recuerdo del evento activo. */
export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const input = await parseBody(request, saveCurationSchema);
    return ok(await saveCuration(event.id, session.sub, input));
  } catch (error) {
    return handleError(error);
  }
}
