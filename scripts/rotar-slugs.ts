/**
 * Cambia el slug de las invitaciones que se crearon con el formato antiguo.
 *
 *   npx tsx scripts/rotar-slugs.ts            # solo las que no se han enviado
 *   npx tsx scripts/rotar-slugs.ts --forzar   # todas, aunque ya se enviaran
 *
 * El formato viejo era `slugify(nombre)` con `-2`, `-3` para los repetidos, y
 * eso hacía adivinable el "secreto" de una invitación: probando nombres comunes
 * se podía abrir la de un desconocido, leer su mensaje personal y sobrescribir
 * su respuesta. Ver src/lib/slug.ts.
 *
 * Por defecto NO toca las que ya se enviaron. Cambiarles el slug rompería el
 * enlace que el invitado ya tiene en su WhatsApp, y para un evento a la vuelta
 * de la esquina eso es peor que el riesgo. Esas se listan al final para que el
 * anfitrión decida: normalmente, volver a mandarlas con `--forzar`.
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hasRandomToken, uniqueSlug } from "../src/lib/slug";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const forzar = process.argv.includes("--forzar");

async function main() {
  const todas = await prisma.invitation.findMany({
    select: {
      id: true,
      eventId: true,
      slug: true,
      guestName: true,
      sentAt: true,
      // Señales de que la invitación YA circuló, aunque sentAt esté vacío:
      // alguien no responde ni abre una invitación que nunca recibió.
      viewCount: true,
      firstViewedAt: true,
      rsvp: { select: { id: true } },
      event: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Un conjunto de slugs por evento: desde que la ruta lleva el evento delante,
  // dos fiestas distintas pueden tener a su "mariana-lopez" sin estorbarse.
  const ocupados = new Map<string, Set<string>>();
  for (const invitation of todas) {
    const set = ocupados.get(invitation.eventId) ?? new Set<string>();
    set.add(invitation.slug);
    ocupados.set(invitation.eventId, set);
  }
  const viejas = todas.filter((invitation) => !hasRandomToken(invitation.slug));

  if (viejas.length === 0) {
    console.log("✔ Todas las invitaciones ya tienen un slug con azar. Nada que hacer.");
    return;
  }

  /**
   * ¿Esta invitación ya salió?
   *
   * `sentAt` es la respuesta directa, pero no la única: una base que venía de
   * antes de la pantalla de envío tiene esa columna vacía aunque la fiesta
   * lleve meses en marcha. Una respuesta guardada o una apertura registrada
   * prueban que el enlace llegó a su destinatario, y eso basta para no
   * tocarlo.
   */
  const yaSalio = (invitation: (typeof todas)[number]) =>
    invitation.sentAt !== null ||
    invitation.rsvp !== null ||
    invitation.viewCount > 0 ||
    invitation.firstViewedAt !== null;

  const rotables = forzar ? viejas : viejas.filter((invitation) => !yaSalio(invitation));
  const enviadas = viejas.filter(yaSalio);

  console.log(`${viejas.length} invitaciones con slug adivinable.`);
  console.log(`Se van a cambiar ${rotables.length}.\n`);

  for (const invitation of rotables) {
    const delEvento = ocupados.get(invitation.eventId) ?? new Set<string>();
    const slug = uniqueSlug(invitation.guestName, delEvento);
    delEvento.add(slug);
    ocupados.set(invitation.eventId, delEvento);
    await prisma.invitation.update({ where: { id: invitation.id }, data: { slug } });
    console.log(`  ${invitation.slug}  →  ${slug}   (${invitation.event.name})`);
  }

  if (!forzar && enviadas.length > 0) {
    console.log(`\n⚠  ${enviadas.length} ya se habían enviado y NO se tocaron:`);
    for (const invitation of enviadas) {
      console.log(`  ${invitation.slug}   (${invitation.guestName} · ${invitation.event.name})`);
    }
    console.log(
      "\n   Su enlace sigue siendo adivinable. Para cambiarlas hay que volver a\n" +
        "   mandarlas: correr con --forzar y reenviar desde /admin/envio."
    );
  }
}

main()
  .catch((error) => {
    console.error("No se pudieron rotar los slugs:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
