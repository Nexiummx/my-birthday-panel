import { requireSession } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";
import { deleteEvent, getEvent, updateEvent } from "@/lib/services/events";
import { updateEventSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const event = await getEvent(id, session.sub);
    if (!event) return fail("El evento no existe", 404);
    return ok(event);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const input = await parseBody(request, updateEventSchema);
    return ok(await updateEvent(id, session.sub, input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteEvent(id, session.sub);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
