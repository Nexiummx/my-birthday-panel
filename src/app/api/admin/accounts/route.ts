import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { createAccount, listAccounts, requireSuperAdmin } from "@/lib/services/accounts";
import { createAccountSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireSession();
    // La comprobación va en el servidor, no en si el enlace se pinta o no.
    await requireSuperAdmin(session.sub);
    return ok(await listAccounts());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    await requireSuperAdmin(session.sub);
    const input = await parseBody(request, createAccountSchema);
    return ok(await createAccount(input), 201);
  } catch (error) {
    return handleError(error);
  }
}
