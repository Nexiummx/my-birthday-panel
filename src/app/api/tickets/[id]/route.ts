import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { setTicketStatus } from "@/lib/services/tickets";
import { updateTicketSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { status } = await parseBody(request, updateTicketSchema);
    // Quién puede tocar este ticket se comprueba en el servicio.
    return ok(await setTicketStatus(id, session.sub, status));
  } catch (error) {
    return handleError(error);
  }
}
