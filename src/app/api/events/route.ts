import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { createEvent, getQuota, listEvents } from "@/lib/services/events";
import { createEventSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireSession();
    const [events, quota] = await Promise.all([
      listEvents(session.sub),
      getQuota(session.sub),
    ]);
    return ok({ events, quota });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, createEventSchema);
    // El cupo se comprueba dentro del servicio: es una regla de negocio, no de
    // la petición, y tiene que valer para cualquier vía de entrada.
    return ok(await createEvent(session.sub, input), 201);
  } catch (error) {
    return handleError(error);
  }
}
