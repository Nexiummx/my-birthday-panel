import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { importInvitations } from "@/lib/services/invitations";
import { getEvent, requireActiveEvent } from "@/lib/services/events";
import { importInvitationsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, importInvitationsSchema);

    // Mismo criterio que el alta individual: el evento indicado solo vale si
    // es de la cuenta; si no, se usa el activo.
    const requested = input.eventId ? await getEvent(input.eventId, session.sub) : null;
    const eventId = requested?.id ?? (await requireActiveEvent(session.sub)).id;

    return ok(await importInvitations(session.sub, eventId, input.guests), 201);
  } catch (error) {
    return handleError(error);
  }
}
