import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { checkInInvitation } from "@/lib/services/invitations";
import { checkInSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

/** Registra la llegada. Con count 0 se deshace, que en la puerta hace falta. */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { count } = await parseBody(request, checkInSchema);
    return ok(await checkInInvitation(id, session.sub, count));
  } catch (error) {
    return handleError(error);
  }
}
