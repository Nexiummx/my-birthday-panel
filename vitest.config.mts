import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` es un centinela para el compilador de Next: revienta si
      // un módulo de servidor acaba en el bundle del navegador. Aquí no hay
      // bundle, y sin este alias no se podría probar nada de la capa de
      // servicios —justo donde vive la lógica que más importa acertar.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
