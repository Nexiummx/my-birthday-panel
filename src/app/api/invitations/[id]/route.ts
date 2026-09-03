import { requireSession } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";
import {
  deleteInvitation,
  getInvitationById,
  updateInvitation,
} from "@/lib/services/invitations";
import { updateInvitationSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const invitation = await getInvitationById(id);
    if (!invitation) return fail("La invitación no existe", 404);
    return ok(invitation);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const input = await parseBody(request, updateInvitationSchema);
    return ok(await updateInvitation(id, input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    await deleteInvitation(id);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
