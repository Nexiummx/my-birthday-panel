import { fail, handleError, ok } from "@/lib/api";
import { getPublicInvitation } from "@/lib/services/invitations";
import { toPublicInvitation } from "@/lib/public-invitation";

type Params = { params: Promise<{ slug: string }> };

/** Endpoint público: solo expone los datos que la invitación necesita mostrar. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const invitation = await getPublicInvitation(slug);
    if (!invitation) return fail("La invitación no existe", 404);
    return ok(toPublicInvitation(invitation));
  } catch (error) {
    return handleError(error);
  }
}
