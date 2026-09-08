import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { getAccount, updateProfile } from "@/lib/services/account";
import { updateProfileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireSession();
    return ok(await getAccount(session.sub));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, updateProfileSchema);
    const account = await updateProfile(session.sub, input);

    // No hace falta reemitir la sesión: Better Auth la guarda en base y solo
    // referencia al usuario por id, así que el correo nuevo se lee solo en la
    // siguiente petición. Con el JWT anterior sí había que rehacerla.
    return ok(account);
  } catch (error) {
    return handleError(error);
  }
}
