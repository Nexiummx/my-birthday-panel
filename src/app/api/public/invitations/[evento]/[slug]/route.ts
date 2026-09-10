import { fail, handleError, ok , tooMany } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getPublicInvitation } from "@/lib/services/invitations";
import { toPublicInvitation } from "@/lib/public-invitation";

type Params = { params: Promise<{ evento: string; slug: string }> };

/** Endpoint público: solo expone los datos que la invitación necesita mostrar. */
export async function GET(request: Request, { params }: Params) {
  try {
    // Ruta pública: sin tope, probar enlaces sale gratis. Ver lib/rate-limit.ts.
    const limite = await rateLimit("invitacion", request, LIMITS.invitacion.max, LIMITS.invitacion.windowMs);
    if (!limite.ok) return tooMany(limite.retryAfter);

    const { evento, slug } = await params;
    const invitation = await getPublicInvitation(evento, slug);
    if (!invitation) return fail("La invitación no existe", 404);
    return ok(toPublicInvitation(invitation));
  } catch (error) {
    return handleError(error);
  }
}
