import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { deletePhoto, setPhotoHidden } from "@/lib/services/photos";
import { updatePhotoSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

/** Ocultar o volver a mostrar. Reversible a propósito. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { hidden } = await parseBody(request, updatePhotoSchema);
    return ok(await setPhotoHidden(id, session.sub, hidden));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deletePhoto(id, session.sub);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
