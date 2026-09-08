import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { changePassword } from "@/lib/services/account";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = await parseBody(request, changePasswordSchema);
    await changePassword(session.sub, input);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
