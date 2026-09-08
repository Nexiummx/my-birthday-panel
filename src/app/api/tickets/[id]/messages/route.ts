import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { replyToTicket } from "@/lib/services/tickets";
import { ticketMessageSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { body } = await parseBody(request, ticketMessageSchema);
    return ok(await replyToTicket(id, session.sub, session.email, body), 201);
  } catch (error) {
    return handleError(error);
  }
}
