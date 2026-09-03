import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { InvitationStatus } from "../src/generated/prisma/enums";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno. Copia .env.example a .env.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Las invitaciones de ejemplo solo sirven para probar el panel en local: con
// `--prod` se siembran únicamente el evento y el administrador, para no meter
// invitados ficticios en la lista real.
const withDemoInvitations = !process.argv.includes("--prod");

const EVENT_SLUG_SEEDS: Array<{
  slug: string;
  guestName: string;
  guestCount: number;
  status: InvitationStatus;
  personalMessage?: string;
  comment?: string;
}> = [
  {
    slug: "mariana-lopez",
    guestName: "Mariana López",
    guestCount: 2,
    status: "PENDING",
    personalMessage: "Nos encantaría celebrar contigo esta noche entre luces y jardín.",
  },
  {
    slug: "carlos-hernandez",
    guestName: "Carlos Hernández",
    guestCount: 1,
    status: "CONFIRMED",
    personalMessage: "Guardamos un lugar especial para ti.",
    comment: "¡Ahí estaré! Gracias por la invitación.",
  },
  {
    slug: "ana-martinez",
    guestName: "Ana Martínez",
    guestCount: 4,
    status: "CONFIRMED",
    comment: "Vamos toda la familia.",
  },
  {
    slug: "sofia-garcia",
    guestName: "Sofía García",
    guestCount: 2,
    status: "DECLINED",
    personalMessage: "Ojalá puedas acompañarnos.",
    comment: "No podré llegar, estaré fuera de la ciudad. ¡Muchas felicidades!",
  },
];

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "⚠  ADMIN_EMAIL / ADMIN_PASSWORD no están definidos: se omite la creación del administrador."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  console.log(`✔ Administrador listo: ${email}`);
}

async function seedEvent() {
  const existing = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });

  const data = {
    name: "Maya · 29",
    date: new Date("2026-09-26T00:00:00.000Z"),
    time: "4:00 pm",
    // El salto de línea se respeta en la invitación: segunda línea más discreta.
    location: "Jardín Rosas y Miel\nSantiago Papasquiaro",
    locationUrl: "https://maps.google.com/?q=Jardin+Rosas+y+Miel+Santiago+Papasquiaro",
    dressCode: "Dress Code Inspo",
    dressCodeUrl: "https://mx.pinterest.com/marianardz5/mayas-bday-dress-code/?invite_code=efe64571c87f4b63be980f98e5cf0e5a&sender=527062100049140585",
    description: "Birthday Celebration",
    invitationImage: null as string | null,
  };

  const event = existing
    ? await prisma.event.update({ where: { id: existing.id }, data })
    : await prisma.event.create({ data });

  console.log(`✔ Evento listo: ${event.name}`);
  return event;
}

async function seedInvitations(eventId: string) {
  for (const seed of EVENT_SLUG_SEEDS) {
    const invitation = await prisma.invitation.upsert({
      where: { slug: seed.slug },
      create: {
        eventId,
        slug: seed.slug,
        guestName: seed.guestName,
        guestCount: seed.guestCount,
        status: seed.status,
        personalMessage: seed.personalMessage ?? null,
      },
      update: {
        eventId,
        guestName: seed.guestName,
        guestCount: seed.guestCount,
        status: seed.status,
        personalMessage: seed.personalMessage ?? null,
      },
    });

    if (seed.status === "PENDING") {
      await prisma.rsvp.deleteMany({ where: { invitationId: invitation.id } });
      continue;
    }

    const guestCount = seed.status === "CONFIRMED" ? seed.guestCount : 0;
    const respondedAt = new Date();

    await prisma.rsvp.upsert({
      where: { invitationId: invitation.id },
      create: {
        invitationId: invitation.id,
        status: seed.status,
        guestCount,
        comment: seed.comment ?? null,
        respondedAt,
      },
      update: {
        status: seed.status,
        guestCount,
        comment: seed.comment ?? null,
        respondedAt,
      },
    });
  }

  console.log(`✔ ${EVENT_SLUG_SEEDS.length} invitaciones listas`);
}

async function main() {
  const event = await seedEvent();
  if (withDemoInvitations) {
    await seedInvitations(event.id);
  }
  await seedAdmin();

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  if (withDemoInvitations) {
    console.log(`\n→ Invitación de ejemplo: ${base}/i/mariana-lopez`);
  }
  console.log(`→ Panel administrativo:  ${base}/admin/login\n`);
}

main()
  .catch((error) => {
    console.error("✖ El seed falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
