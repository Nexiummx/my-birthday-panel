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
};

export default nextConfig;
