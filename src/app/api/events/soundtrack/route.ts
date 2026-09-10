import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { requireActiveEvent } from "@/lib/services/events";
import {
  removeSoundtrack,
  saveSoundtrack,
  setSoundtrackStart,
} from "@/lib/services/soundtrack";
import { saveSoundtrackSchema, soundtrackStartSchema } from "@/lib/validations";

/** Paso 2: el archivo ya está arriba, se guarda con su nombre y su arranque. */
export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const input = await parseBody(request, saveSoundtrackSchema);
    return ok(await saveSoundtrack(event.id, session.sub, input));
  } catch (error) {
    return handleError(error);
  }
}

/** Mover el trozo que suena. Va aparte de PUT porque no vuelve a subir nada:
 *  es lo que se toca una y otra vez mientras se busca el estribillo. */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const { startMs } = await parseBody(request, soundtrackStartSchema);
    return ok(await setSoundtrackStart(event.id, session.sub, startMs));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    return ok(await removeSoundtrack(event.id, session.sub));
  } catch (error) {
    return handleError(error);
  }
}
