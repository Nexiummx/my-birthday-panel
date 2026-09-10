/**
 * Comprueba que las fotos se están guardando DONDE CREES.
 *
 *   npx tsx scripts/probar-almacenamiento.ts
 *   npx tsx scripts/probar-almacenamiento.ts --url https://tu-dominio.com
 *
 * Existe por un fallo que no se ve: si faltan SUPABASE_URL o
 * SUPABASE_SERVICE_ROLE_KEY, el almacenamiento cae al disco local sin ningún
 * error. En Vercel ese disco es efímero, así que el invitado sube su foto, la
 * ve perfectamente, y desaparece un rato después. Nadie lo reporta hasta que
 * es tarde.
 *
 * No importa src/lib/storage.ts a propósito: eso probaría una copia del
 * código. Esto hace lo MISMO que hace el navegador de un invitado —pedir
 * permiso, subir, y leer la URL pública— contra la aplicación que esté
 * corriendo, así que prueba el camino de verdad.
 *
 * Sube un archivo diminuto. Al terminar dice qué ruta borrar.
 */
import "./env";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const base = (flag("url") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Un PNG de 1×1 transparente. Lo más pequeño que se puede subir de verdad. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const ok = (texto: string) => console.log(`  ✔ ${texto}`);
const mal = (texto: string) => console.log(`  ✖ ${texto}`);

async function main() {
  console.log(`\nProbando el almacenamiento de ${base}\n`);

  /* 1. ¿Hay un evento con la puerta de fotos abierta? */
  const code = flag("code") ?? process.env.SHARE_CODE;
  if (!code) {
    console.error(
      "Falta el código del evento. Sácalo del panel (Fotos → el QR) y pásalo:\n" +
        "   npx tsx scripts/probar-almacenamiento.ts --code abcd123456\n"
    );
    process.exitCode = 1;
    return;
  }

  /* 2. Pedir permiso para subir, igual que el navegador del invitado. */
  const firma = await fetch(`${base}/api/public/photos/firmar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, contentType: "image/png", bytes: PIXEL.length }),
  });

  if (!firma.ok) {
    mal(`la aplicación no firmó la subida (${firma.status})`);
    console.log(`    ${(await firma.text()).slice(0, 200)}`);
    process.exitCode = 1;
    return;
  }

  const { data } = (await firma.json()) as {
    data: { path: string; target: { url: string; method: string; headers: Record<string, string> } };
  };
  ok(`la aplicación firmó la subida`);
  console.log(`    ruta:  ${data.path}`);

  /* 3. LO QUE DE VERDAD IMPORTA: ¿qué controlador contestó? */
  const esLocal = data.target.url.startsWith("/api/media/subir");
  if (esLocal) {
    mal("está usando el DISCO LOCAL, no Supabase");
    console.log("");
    console.log("    Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en este entorno.");
    console.log("    En local no pasa nada. En Vercel esto significa que las fotos de");
    console.log("    tus invitados se pierden sin avisar: el disco es efímero.");
    console.log("");
    process.exitCode = 1;
    return;
  }
  ok(`está usando Supabase (${new URL(data.target.url).host})`);

  /* 4. Subir de verdad. */
  const subida = await fetch(data.target.url, {
    method: data.target.method,
    headers: data.target.headers,
    body: new Uint8Array(PIXEL),
  });
  if (!subida.ok) {
    mal(`Supabase rechazó el archivo (${subida.status})`);
    console.log(`    ${(await subida.text()).slice(0, 200)}`);
    process.exitCode = 1;
    return;
  }
  ok("el archivo subió");

  /* 5. Leerlo por su URL pública: si el bucket no es público, esto falla. */
  const publica = `${process.env.SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/${
    process.env.SUPABASE_STORAGE_BUCKET || "fotos"
  }/${data.path}`;

  const lectura = await fetch(publica);
  if (!lectura.ok) {
    mal(`no se puede leer por su URL pública (${lectura.status})`);
    console.log("    El bucket no es público. Supabase → Storage → el bucket → Make public.");
    console.log(`    ${publica}`);
    process.exitCode = 1;
    return;
  }

  const bytes = Buffer.from(await lectura.arrayBuffer());
  if (!bytes.equals(PIXEL)) {
    mal(`lo que se lee no es lo que se subió (${bytes.length} bytes en vez de ${PIXEL.length})`);
    process.exitCode = 1;
    return;
  }
  ok(`se lee de vuelta, byte a byte (${bytes.length} bytes)`);

  console.log("\nTodo correcto. Las fotos de tus invitados se van a conservar.");
  console.log("\nBorra el archivo de prueba desde Supabase → Storage:");
  console.log(`   ${data.path}\n`);
}

main().catch((error) => {
  console.error("\nNo se pudo probar:", error instanceof Error ? error.message : error, "\n");
  process.exitCode = 1;
});
