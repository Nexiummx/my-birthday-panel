import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { deleteAccount, requireSuperAdmin, updateAccount } from "@/lib/services/accounts";
import { updateAccountSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requireSuperAdmin(session.sub);
    const { id } = await params;
    const input = await parseBody(request, updateAccountSchema);
    return ok(await updateAccount(id, session.sub, input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requireSuperAdmin(session.sub);
    const { id } = await params;
    await deleteAccount(id, session.sub);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
