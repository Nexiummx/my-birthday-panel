import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { createInvitation, listInvitations } from "@/lib/services/invitations";
import { getEvent, requireActiveEvent } from "@/lib/services/events";
import { createInvitationSchema } from "@/lib/validations";

/**
 * Resuelve sobre qué evento opera la petición: el que venga indicado, siempre
 * que sea de la cuenta, y si no el activo. Nunca se confía en el id a secas.
 */
async function resolveEventId(ownerId: string, requested?: string | null) {
  if (requested) {
    const event = await getEvent(requested, ownerId);
    // Un evento ajeno se trata como inexistente: no se confirma que exista.
    if (event) return event.id;
  }
  return (await requireActiveEvent(ownerId)).id;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const requested = new URL(request.url).searchParams.get("eventId");
    const eventId = await resolveEventId(session.sub, requested);
    return ok(await listInvitations(session.sub, eventId));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, createInvitationSchema);
    const eventId = await resolveEventId(session.sub, input.eventId);
    return ok(await createInvitation(session.sub, eventId, input), 201);
  } catch (error) {
    return handleError(error);
  }
}
