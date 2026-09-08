import { createSession, requireSession } from "@/lib/auth";
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

    // El JWT lleva el correo dentro. Si no se reemite, la sesión sigue viva con
    // el dato viejo hasta que caduque.
    await createSession({ sub: account.id, email: account.email });

    return ok(account);
  } catch (error) {
    return handleError(error);
  }
}
