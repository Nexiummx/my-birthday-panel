/**
 * Enseña las rutas públicas tal como quedan: /e/[evento]/i/[invitado].
 *
 *   npx tsx scripts/ver-rutas.ts
 *
 * Sirve para comprobar de un vistazo qué slug le tocó a cada evento —el de
 * fábrica sale del nombre— antes de empezar a mandar invitaciones.
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const eventos = await prisma.event.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      slug: true,
      invitations: {
        orderBy: { guestName: "asc" },
        select: { slug: true, guestName: true, sentAt: true },
      },
    },
  });

  for (const evento of eventos) {
    console.log(`\n${evento.name}   →   /e/${evento.slug}`);
    for (const invitado of evento.invitations.slice(0, 5)) {
      const marca = invitado.sentAt ? "enviada" : "sin enviar";
      console.log(`   /e/${evento.slug}/i/${invitado.slug}   (${marca})`);
    }
    if (evento.invitations.length > 5) {
      console.log(`   … y ${evento.invitations.length - 5} más`);
    }
  }
  console.log();
}

main()
  .catch((error) => {
    console.error("No se pudieron leer las rutas:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
