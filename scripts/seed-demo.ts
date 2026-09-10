/**
 * Llena un evento con una lista de invitados creíble, para ver cómo se
 * comporta el producto con material real.
 *
 *   npx tsx scripts/seed-demo.ts                       # 42 invitados en el primer evento
 *   npx tsx scripts/seed-demo.ts --code a9d658727d --count 60
 *   npx tsx scripts/seed-demo.ts --limpiar             # borra TODAS las invitaciones del evento
 *
 * No es un volcado plano: reparte a la gente por el embudo real de un evento
 * —sin enviar, enviada, abierta sin contestar, confirmada, declinada— y con las
 * proporciones que se ven de verdad. Un panel donde todo el mundo confirmó no
 * sirve para saber si las pantallas se entienden.
 *
 * Escribe respetando el cifrado de campos: si FIELD_ENCRYPTION_KEY_V1 está
 * puesta, los teléfonos y los mensajes entran cifrados igual que por la
 * aplicación. Ver src/lib/crypto/field-crypto.ts.
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptNullable } from "../src/lib/crypto/field-crypto";
import { uniqueSlug } from "../src/lib/slug";

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

/** Azar reproducible: el mismo evento da siempre la misma lista. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const NOMBRES = [
  "María Fernanda", "José Luis", "Ana Sofía", "Juan Carlos", "Regina", "Diego",
  "Valentina", "Emiliano", "Camila", "Santiago", "Renata", "Mateo", "Ximena",
  "Alejandro", "Isabella", "Sebastián", "Paulina", "Andrés", "Fernanda", "Rodrigo",
  "Daniela", "Ricardo", "Mariana", "Guillermo", "Natalia", "Eduardo", "Carolina",
  "Héctor", "Lucía", "Óscar", "Gabriela", "Arturo", "Montserrat", "Iván",
  "Alejandra", "Miguel Ángel", "Jimena", "Francisco", "Rocío", "Salvador",
  "Verónica", "Joaquín", "Bárbara", "Ignacio", "Elena", "Rubén",
];

const APELLIDOS = [
  "García", "Hernández", "López", "Martínez", "Rodríguez", "Pérez", "Sánchez",
  "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales",
  "Ortiz", "Gutiérrez", "Chávez", "Ramos", "Vázquez", "Castillo", "Mendoza",
  "Herrera", "Aguilar", "Solís", "Ibarra", "Zavala", "Núñez", "Rojas", "Peña",
];

/** Ladas reales de México, para que los teléfonos se vean como teléfonos. */
const LADAS = ["55", "81", "33", "618", "222", "477", "998", "444", "664", "871"];

/** Lo que el anfitrión le escribe a alguien en particular. No a todos. */
const MENSAJES_ANFITRION = [
  "No sabes la ilusión que nos hace que estés.",
  "Guardamos un lugar especial para ti.",
  "Ojalá puedas acompañarnos, sería lo máximo.",
  "Después de tantos años, esta no te la puedes perder.",
  "Tú fuiste de las primeras en enterarte, así que ahí te esperamos.",
];

/** Lo que contestan los invitados. Mezcla larga y corta a propósito: el
 *  recuerdo elige los más largos, y hay que ver que la selección funciona. */
const CONFIRMAN = [
  "¡Ahí estaré! Gracias por la invitación.",
  "Vamos toda la familia, no nos lo perdemos.",
  "Cuenten conmigo, ya tengo hasta el vestido.",
  "Qué emoción, hace años que no nos vemos todos juntos. Ahí estaremos temprano para ayudar en lo que se necesite.",
  "Ahí vamos los cuatro. Avísame si llevo algo.",
  "No me lo pierdo por nada del mundo. Gracias por acordarte de nosotros, de verdad significa mucho.",
  "Confirmado, ya aparté el día.",
  "Voy con mucho gusto. Felicidades desde ya.",
  "Ahí estaremos. Qué bonito que sigan haciendo estas reuniones, cada año son mejores.",
  "Sí voy, y llevo el postre que me pediste.",
  "Nos vemos allá. Ya extrañaba estas fiestas.",
  "Claro que sí. Que sea el primero de muchos.",
];

const DECLINAN = [
  "No podré llegar, estaré fuera de la ciudad. ¡Muchas felicidades!",
  "Me encantaría pero justo tengo boda ese día. Un abrazo enorme.",
  "Esta vez no puedo, ando en época de exámenes. Que la pasen increíble.",
  "Ojalá pudiera. Mándame fotos de todo, por favor.",
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
    const { count } = await prisma.invitation.deleteMany({ where: { eventId: event.id } });
    console.log(`✔ Borradas ${count} invitaciones de "${event.name}" (con sus respuestas).`);
    return;
  }

  const total = Number(flag("count") ?? "42");
  const next = rng(event.id.length * 104729 + total);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];

  // Solo los de este evento: es donde el slug tiene que ser único.
  const ocupados = new Set(
    (
      await prisma.invitation.findMany({
        where: { eventId: event.id },
        select: { slug: true },
      })
    ).map((row) => row.slug)
  );

  console.log(`Sembrando ${total} invitados en "${event.name}"…\n`);

  const resumen = { sinEnviar: 0, enviadas: 0, abiertas: 0, confirmadas: 0, declinadas: 0, entradas: 0 };
  const ahora = Date.now();

  for (let i = 0; i < total; i += 1) {
    const guestName = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    const slug = uniqueSlug(guestName, ocupados);
    ocupados.add(slug);

    // Pases: la mayoría trae uno o dos; alguna familia trae cinco.
    const dado = next();
    const guestCount = dado > 0.93 ? 5 : dado > 0.78 ? 4 : dado > 0.5 ? 2 : 1;

    // Ocho de cada diez tienen teléfono: es lo realista, y deja ver la pantalla
    // de envío con filas que se pueden mandar y filas que no.
    const phone =
      next() < 0.8
        ? `${pick(LADAS)} ${Math.floor(1000000 + next() * 8999999)}`.replace(
            /(\d{3})(\d{4})$/,
            "$1 $2"
          )
        : null;

    const personalMessage = next() < 0.22 ? pick(MENSAJES_ANFITRION) : null;

    // ── El embudo ────────────────────────────────────────────────────
    //   12 % sin enviar · 18 % enviada sin abrir · 20 % abierta sin contestar
    //   38 % confirma   · 12 % declina
    const etapa = next();
    const sinEnviar = etapa < 0.12;
    const soloEnviada = !sinEnviar && etapa < 0.3;
    const abiertaSinContestar = !sinEnviar && !soloEnviada && etapa < 0.5;
    const declina = !sinEnviar && !soloEnviada && !abiertaSinContestar && etapa > 0.88;
    const confirma = !sinEnviar && !soloEnviada && !abiertaSinContestar && !declina;

    const sentAt = sinEnviar ? null : new Date(ahora - (2 + next() * 12) * 86400000);
    const abierta = !sinEnviar && !soloEnviada;
    const firstViewedAt = abierta
      ? new Date(sentAt!.getTime() + (0.2 + next() * 2) * 86400000)
      : null;

    const status = confirma ? "CONFIRMED" : declina ? "DECLINED" : "PENDING";

    // Quien confirmó, casi siempre llegó; y a veces con más gente de la que dijo.
    const asistentes = confirma && next() < 0.82
      ? Math.max(1, guestCount + (next() < 0.15 ? 1 : next() < 0.25 ? -1 : 0))
      : 0;

    await prisma.invitation.create({
      data: {
        eventId: event.id,
        slug,
        guestName,
        guestCount,
        status,
        phone: encryptNullable(phone),
        personalMessage: encryptNullable(personalMessage),
        sentAt,
        firstViewedAt,
        lastViewedAt: firstViewedAt
          ? new Date(firstViewedAt.getTime() + next() * 3 * 86400000)
          : null,
        viewCount: firstViewedAt ? 1 + Math.floor(next() * 5) : 0,
        checkedInAt: asistentes > 0 ? new Date(ahora - next() * 86400000) : null,
        checkedInCount: asistentes,
        ...(confirma || declina
          ? {
              rsvp: {
                create: {
                  status,
                  guestCount: confirma ? guestCount : 0,
                  // Tres de cada cuatro dejan recado; el resto solo confirma.
                  comment: encryptNullable(
                    next() < 0.75 ? pick(confirma ? CONFIRMAN : DECLINAN) : null
                  ),
                  respondedAt: new Date(
                    (firstViewedAt ?? sentAt ?? new Date()).getTime() + next() * 2 * 86400000
                  ),
                },
              },
            }
          : {}),
      },
    });

    if (sinEnviar) resumen.sinEnviar += 1;
    else if (soloEnviada) resumen.enviadas += 1;
    else if (abiertaSinContestar) resumen.abiertas += 1;
    else if (confirma) resumen.confirmadas += 1;
    else resumen.declinadas += 1;
    if (asistentes > 0) resumen.entradas += 1;
  }

  console.log("✔ Listo. Así quedó el embudo:\n");
  console.log(`   Sin enviar                ${resumen.sinEnviar}`);
  console.log(`   Enviadas, sin abrir       ${resumen.enviadas}`);
  console.log(`   Abiertas, sin contestar   ${resumen.abiertas}`);
  console.log(`   Confirmadas               ${resumen.confirmadas}`);
  console.log(`   Declinadas                ${resumen.declinadas}`);
  console.log(`   Llegaron a la fiesta      ${resumen.entradas}`);
}

main()
  .catch((error) => {
    console.error("No se pudo sembrar:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
