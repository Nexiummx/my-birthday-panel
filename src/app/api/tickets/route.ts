import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { createTicket } from "@/lib/services/tickets";
import { createTicketSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, createTicketSchema);
    return ok(await createTicket(session.sub, session.email, input), 201);
  } catch (error) {
    return handleError(error);
  }
}
