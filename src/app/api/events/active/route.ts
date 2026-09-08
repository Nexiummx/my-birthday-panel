import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";
import { ACTIVE_EVENT_COOKIE, getEvent } from "@/lib/services/events";

const schema = z.object({ eventId: z.string().min(1) });

/**
 * Cambia el evento sobre el que trabaja el panel. La cookie solo guarda una
 * preferencia: cada lectura vuelve a comprobar que el evento sigue siendo de
 * la cuenta, así que manipularla a mano no da acceso a nada.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { eventId } = await parseBody(request, schema);

    const event = await getEvent(eventId, session.sub);
    if (!event) return fail("El evento no existe", 404);

    const store = await cookies();
    store.set(ACTIVE_EVENT_COOKIE, event.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return ok({ id: event.id, name: event.name });
  } catch (error) {
    return handleError(error);
  }
}
