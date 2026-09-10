import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La miniatura de WhatsApp lee el marco y las tipografías desde assets/ en
  // tiempo de ejecución: sin esto no viajan al bundle serverless de Vercel.
  outputFileTracingIncludes: {
    "/i/[slug]": ["./assets/**/*"],
  },
  // sharp trae binarios nativos: debe cargarse en tiempo de ejecución, no
  // pasar por el bundler.
  serverExternalPackages: ["sharp"],

  /**
   * Cabeceras de seguridad.
   *
   * No arreglan ningún fallo de hoy: son la red por si mañana entra uno. La que
   * más importa es `frame-ancestors`, que impide meter el panel en un iframe
   * ajeno para engañar a un anfitrión con la sesión abierta.
   *
   * No hay CSP completa a propósito. Next inyecta scripts en línea y una CSP
   * estricta necesita nonces por petición; ponerla a medias —con
   * `unsafe-inline`— daría una falsa sensación de protección. Es una tarea
   * aparte y hay que hacerla bien.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          {
            // Nada de esto se usa; negarlo evita que un script inyectado lo pida.
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
