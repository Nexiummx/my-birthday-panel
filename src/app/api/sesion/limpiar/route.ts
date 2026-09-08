import { NextResponse } from "next/server";
import { getCookies } from "better-auth/cookies";
import { auth } from "@/lib/better-auth";

/**
 * Borra las cookies de una sesión que ya no existe y devuelve al acceso.
 *
 * Existe por un bucle real: al eliminar una cuenta, sus filas de `sessions`
 * caen en cascada, pero **la cookie sigue en el navegador**. A partir de ahí
 * las dos capas se contradicen sin parar:
 *
 *   proxy.ts   → hay cookie, luego hay sesión → deja pasar a /admin
 *   el layout  → la sesión no está en la base → redirige a /admin/login
 *   proxy.ts   → hay cookie y esto es una ruta de acceso → vuelve a /admin
 *
 * El borde no puede resolverlo: validar la cookie exigiría una consulta a la
 * base en cada petición, que es justo lo que proxy.ts evita a propósito. Así
 * que lo resuelve quien sí puede escribir cookies —un route handler— y el
 * servidor manda aquí en cuanto detecta una sesión inválida.
 *
 * Cubre toda la familia, no solo la cuenta borrada: sesión caducada, sesión
 * revocada desde otro dispositivo o base recreada en desarrollo.
 *
 * No cuelga de /api/auth/* a propósito: ahí manda el catch-all de Better Auth
 * y se comería esta ruta.
 */
export const dynamic = "force-dynamic";

/** Nombres reales de las cookies, tomados de nuestra configuración. */
function sessionCookieNames(): string[] {
  const names = new Set<string>();

  for (const entry of Object.values(getCookies(auth.options))) {
    const name = (entry as { name?: string })?.name;
    if (!name) continue;
    names.add(name);
    // En producción las cookies llevan el prefijo __Secure-. Se expiran las dos
    // formas: sale más barato que acertar con el entorno.
    names.add(name.startsWith("__Secure-") ? name.slice("__Secure-".length) : `__Secure-${name}`);
  }

  return [...names];
}

export async function GET(request: Request) {
  const target = new URL("/admin/login", new URL(request.url).origin);
  // La marca la lee el proxy como cortacircuitos y el formulario para explicar
  // qué pasó. Si el borrado de cookies fallara, esto sigue rompiendo el bucle.
  target.searchParams.set("sesion", "expirada");

  const response = NextResponse.redirect(target);

  for (const name of sessionCookieNames()) {
    // El path tiene que coincidir con el del alta ("/") o el navegador la deja
    // intacta y el bucle vuelve.
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return response;
}
