import { createSession, requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { changePassword } from "@/lib/services/account";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, changePasswordSchema);
    await changePassword(session.sub, input);

    // Sesión nueva tras el cambio: el titular sigue dentro sin tener que volver
    // a entrar, y la cuenta arranca un ciclo limpio de 8 horas.
    await createSession({ sub: session.sub, email: session.email });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
