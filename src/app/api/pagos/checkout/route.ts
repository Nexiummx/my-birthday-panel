import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { startCheckout } from "@/lib/services/payments";
import { checkoutSchema } from "@/lib/validations";

/**
 * Arranca un cobro y devuelve a dónde mandar al cliente.
 *
 * El importe NO viene del cuerpo: solo llega el id del plan, y el precio sale
 * del catálogo del servidor. Si el importe llegara del navegador, cualquiera
 * podría comprar el plano de cinco eventos por un peso.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { planId } = await parseBody(request, checkoutSchema);
    return ok(await startCheckout(session.sub, planId));
  } catch (error) {
    return handleError(error);
  }
}
