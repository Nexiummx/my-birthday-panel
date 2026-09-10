/**
 * Sube videos de prueba a un evento, por la misma puerta que un invitado.
 *
 *   npx tsx scripts/seed-videos.ts --desde /ruta/con/clips
 *   npx tsx scripts/seed-videos.ts --desde /ruta --code a9d658727d
 *   npx tsx scripts/seed-videos.ts --limpiar
 *
 * Espera pares `nombre.mp4` + `nombre.jpg` (el clip y su portada). Los clips no
 * los genera este script: un navegador es lo único que sabe grabar video aquí,
 * así que se generan aparte y esto solo los sube.
 *
 * Sube firmando, subiendo y registrando —los tres pasos reales— en vez de
 * insertar filas: así el material de prueba prueba también el camino, y
 * funciona igual con el almacenamiento local que con Supabase.
 *
 * Necesita la aplicación levantada (npm run dev).
 */
import "./env";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

const BASE = (flag("url") ?? "http://localhost:3000").replace(/\/$/, "");

const AUTORES = ["Mariana López", "Diego Herrera", "Sofía Ramírez", "Valentina Cruz"];
const PIES = [
  "Las mañanitas",
  "El brindis",
  "Cuando salieron las luces",
  "Nadie se sentó en toda la noche",
];

async function main() {
  const code = flag("code");
  const event = code
    ? await prisma.event.findUnique({ where: { shareCode: code } })
    : await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });

  if (!event) {
    throw new Error(code ? `Ningún evento con el código ${code}` : "No hay eventos todavía");
  }

  if (has("limpiar")) {
    const { count } = await prisma.photo.deleteMany({
      where: { eventId: event.id, kind: "VIDEO" },
    });
    console.log(`✔ Borrados ${count} videos de "${event.name}"`);
    console.log("  Los archivos del almacenamiento no se tocan: bórralos si molestan.");
    return;
  }

  const desde = flag("desde");
  if (!desde || !existsSync(desde)) {
    throw new Error("Falta --desde con la carpeta que tiene los clips (.mp4 + .jpg)");
  }

  const clips = readdirSync(desde).filter((file) => extname(file) === ".mp4");
  if (clips.length === 0) {
    throw new Error(`No hay .mp4 en ${desde}`);
  }

  console.log(`Subiendo ${clips.length} videos a "${event.name}" (${BASE})…\n`);

  for (const [indice, file] of clips.entries()) {
    const nombre = basename(file, ".mp4");
    const video = readFileSync(join(desde, file));
    const posterPath = join(desde, `${nombre}.jpg`);
    const poster = existsSync(posterPath) ? readFileSync(posterPath) : null;

    // 1. Permiso. Con kind VIDEO se firman dos destinos: el clip y su portada.
    const sign = await fetch(`${BASE}/api/public/photos/firmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: event.shareCode,
        kind: "VIDEO",
        contentType: "video/mp4",
        bytes: video.byteLength,
      }),
    });
    if (!sign.ok) {
      console.error(`  ✖ ${nombre}: ${(await sign.text()).slice(0, 120)}`);
      continue;
    }
    const { data } = (await sign.json()) as {
      data: {
        path: string;
        target: { url: string; method: string; headers: Record<string, string> };
        poster: { path: string; target: { url: string; method: string; headers: Record<string, string> } } | null;
      };
    };

    const put = async (
      target: { url: string; method: string; headers: Record<string, string> },
      body: Buffer
    ) => {
      const url = target.url.startsWith("http") ? target.url : `${BASE}${target.url}`;
      const response = await fetch(url, {
        method: target.method,
        headers: target.headers,
        body: new Uint8Array(body),
      });
      if (!response.ok) throw new Error(`subida ${response.status}`);
    };

    // 2. Los archivos.
    await put(data.target, video);
    let uploadedPoster: string | undefined;
    if (poster && data.poster) {
      await put(data.poster.target, poster);
      uploadedPoster = data.poster.path;
    }

    // 3. El alta.
    const register = await fetch(`${BASE}/api/public/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: event.shareCode,
        kind: "VIDEO",
        path: data.path,
        width: 720,
        height: 1280,
        bytes: video.byteLength,
        durationMs: 7000,
        posterPath: uploadedPoster,
        authorName: AUTORES[indice % AUTORES.length],
        caption: PIES[indice % PIES.length],
      }),
    });

    console.log(
      register.ok
        ? `  ✔ ${nombre} · ${(video.byteLength / 1048576).toFixed(2)} MB`
        : `  ✖ ${nombre}: ${(await register.text()).slice(0, 120)}`
    );
  }

  console.log(`\n  Galería:  ${BASE}/f/${event.shareCode}`);
  console.log(`  Recuerdo: ${BASE}/r/${event.shareCode}`);
}

main()
  .catch((error) => {
    console.error("No se pudieron subir los videos:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
