import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { changePassword } from "@/lib/services/account";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, changePasswordSchema);
    // El token de esta sesión viaja para que no se cierre a sí misma: ver
    // changePassword.
    const { closedSessions } = await changePassword(session.sub, input, session.token);
    return ok({ success: true, closedSessions });
  } catch (error) {
    return handleError(error);
  }
}
