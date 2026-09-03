import { authenticateAdmin, createSession } from "@/lib/auth";
import { handleError, fail, ok, parseBody } from "@/lib/api";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const { email, password } = await parseBody(request, loginSchema);
    const admin = await authenticateAdmin(email, password);

    if (!admin) {
      return fail("Correo o contraseña incorrectos", 401);
    }

    await createSession({ sub: admin.id, email: admin.email });
    return ok({ email: admin.email });
  } catch (error) {
    return handleError(error);
  }
}
