/**
 * Llena la galería de un evento con fotos de prueba.
 *
 *   npm run seed:fotos                          # 30 fotos en el primer evento
 *   npm run seed:fotos -- --code a9d658727d --count 40
 *   npm run seed:fotos -- --limpiar             # borra las del evento
 *
 * Las imágenes las dibuja scripts/party-images.ts: no se descarga nada ni se
 * usa la cara de nadie.
 *
 * Sube por la MISMA puerta que un invitado —firmar, subir, registrar— en vez de
 * insertar filas a mano. Así el material de prueba prueba también el camino
 * real, y funciona igual con el almacenamiento local que con Supabase.
 *
 * Necesita la aplicación levantada (npm run dev).
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { partyImage, rng } from "./party-images";

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

/** Invitados que suben fotos. Se repiten para que alguien destaque de verdad. */
const AUTORES = [
  "Mariana López", "Mariana López", "Mariana López", "Mariana López",
  "Sofía Ramírez", "Sofía Ramírez", "Sofía Ramírez",
  "Diego Herrera", "Diego Herrera",
  "Valentina Cruz", "Valentina Cruz",
  "Andrés Peña", "Regina Ortiz", "Camila Ruiz",
  "Emiliano Vargas", "Fernanda Solís", "Paulina Ibarra", "Sebastián Mora",
];

const PIES = [
  "El momento del pastel 🎂",
  "No se ve, pero estábamos cantando",
  "Las luces quedaron increíbles",
  "Esta es mi favorita",
  "Antes de que se acabara la batería",
  "La mesa quedó preciosa",
  "Nadie se sentó en toda la noche",
  "Fotito obligada",
];

const BASE = (flag("url") ?? "http://localhost:3000").replace(/\/$/, "");

async function main() {
  const code = flag("code");
  const event = code
    ? await prisma.event.findUnique({ where: { shareCode: code } })
    : await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });

  if (!event) {
    throw new Error(code ? `Ningún evento con el código ${code}` : "No hay eventos todavía");
  }

  if (has("limpiar")) {
    const { count } = await prisma.photo.deleteMany({ where: { eventId: event.id } });
    console.log(`✔ Borradas ${count} fotos de "${event.name}"`);
    console.log("  Los archivos del almacenamiento no se tocan: bórralos si molestan.");
    return;
  }

  const total = Number(flag("count") ?? "30");
  console.log(`Generando ${total} fotos para "${event.name}" (${BASE})…\n`);

  const next = rng(event.id.length * 7919);
  let subidas = 0;

  for (let i = 0; i < total; i += 1) {
    const { buffer, width, height, escena } = await partyImage(i + 1);
    const autor = AUTORES[Math.floor(next() * AUTORES.length)];
    const pie = next() < 0.4 ? PIES[Math.floor(next() * PIES.length)] : undefined;

    try {
      const firma = await fetch(`${BASE}/api/public/photos/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: event.shareCode,
          contentType: "image/jpeg",
          bytes: buffer.byteLength,
        }),
      });

      if (!firma.ok) {
        throw new Error(`firmar → ${firma.status} ${(await firma.text()).slice(0, 120)}`);
      }

      const { data } = (await firma.json()) as {
        data: { path: string; target: { url: string; method: string; headers: Record<string, string> } };
      };

      // El controlador local devuelve una ruta relativa; Supabase, una absoluta.
      const destino = data.target.url.startsWith("http") ? data.target.url : `${BASE}${data.target.url}`;

      const subida = await fetch(destino, {
        method: data.target.method,
        headers: data.target.headers,
        body: new Uint8Array(buffer),
      });
      if (!subida.ok) {
        throw new Error(`subir → ${subida.status}`);
      }

      const alta = await fetch(`${BASE}/api/public/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: event.shareCode,
          path: data.path,
          width,
          height,
          bytes: buffer.byteLength,
          authorName: autor,
          caption: pie,
        }),
      });
      if (!alta.ok) {
        throw new Error(`registrar → ${alta.status} ${(await alta.text()).slice(0, 120)}`);
      }

      subidas += 1;
      process.stdout.write(`  ${String(subidas).padStart(2)} ${escena.padEnd(9)} ${autor}\n`);
    } catch (error) {
      console.error(`  ✗ foto ${i + 1}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Las fechas de subida se reparten a lo largo de la noche: de golpe todas
  // iguales, el orden de la galería no significa nada.
  const fotos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const inicio = new Date(event.date);
  inicio.setHours(20, 0, 0, 0);
  await prisma.$transaction(
    fotos.map((foto, index) =>
      prisma.photo.update({
        where: { id: foto.id },
        data: { createdAt: new Date(inicio.getTime() + index * 7 * 60 * 1000) },
      })
    )
  );

  console.log(`\n✔ ${subidas} fotos en "${event.name}"`);
  console.log(`  Galería:  ${BASE}/f/${event.shareCode}`);
  console.log(`  Recuerdo: ${BASE}/r/${event.shareCode}`);
}

main()
  .catch((error) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
    console.error("  ¿Está la aplicación levantada? (npm run dev)");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
