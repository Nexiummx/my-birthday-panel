import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth";

/**
 * Todas las rutas de Better Auth: alta, acceso, cierre de sesión, olvido y
 * restablecimiento de contraseña, verificación de correo y los redirectores de
 * Google y Facebook.
 */
export const { GET, POST } = toNextJsHandler(auth);
