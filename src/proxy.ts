import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_ROUTES = [
  "/admin/login",
  "/admin/registro",
  "/admin/recuperar",
  "/admin/restablecer",
];

/**
 * Protege /admin en el borde, antes de renderizar nada (convención `proxy` de
 * Next 16, sucesora de `middleware`).
 *
 * Aquí solo se comprueba que EXISTA la cookie de sesión, no que sea válida: en
 * el borde no hay acceso a la base y validarla exigiría una consulta por
 * petición. Es un filtro de tráfico, no la barrera de seguridad — esa está en
 * el layout del panel y en `requireSession()` de cada ruta de API, que sí
 * verifican la sesión contra la base.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Las pantallas de autenticación son públicas por definición: si el proxy
  // las protegiera, nadie podría entrar ni recuperar su contraseña.
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Con sesión abierta, volver al acceso o al alta no tiene sentido.
  if (hasSession && isAuthRoute && pathname !== "/admin/restablecer") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
