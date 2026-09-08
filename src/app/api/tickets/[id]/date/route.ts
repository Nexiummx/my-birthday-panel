import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { resolveDateChange } from "@/lib/services/tickets";
import { resolveDateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

/**
 * Mueve la fecha de un evento saltándose la ventana de un mes. La comprobación
 * de que quien llama es del equipo vive en el servicio, con el resto de la
 * regla, para que valga sea cual sea la vía de entrada.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { date } = await parseBody(request, resolveDateSchema);
    return ok(await resolveDateChange(id, session.sub, session.email, date));
  } catch (error) {
    return handleError(error);
  }
}
