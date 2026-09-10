import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { markInvitationsSent } from "@/lib/services/invitations";
import { requireActiveEvent } from "@/lib/services/events";
import { markSentSchema } from "@/lib/validations";

/** Marca o desmarca invitaciones como enviadas. En bloque: se manda por tandas. */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const { ids, sent } = await parseBody(request, markSentSchema);
    return ok(await markInvitationsSent(session.sub, event.id, ids, sent));
  } catch (error) {
    return handleError(error);
  }
}
