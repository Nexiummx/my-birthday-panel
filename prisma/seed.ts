import "../scripts/env";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { InvitationStatus } from "../src/generated/prisma/enums";
import { newShareCode } from "../src/lib/share-code";

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

  // La cuenta del seed es la interna: superadmin y con cupo holgado. En una
  // cuenta que ya existe solo se refresca la contraseña, nunca el cupo.
  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: "Equipo", eventQuota: 5, isSuperAdmin: true, emailVerified: true },
    update: {},
  });

  // La contraseña vive en accounts, no en el usuario: es como Better Auth
  // permite que una cuenta tenga a la vez contraseña y proveedores sociales.
  const existing = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data: { password: passwordHash } });
  } else {
    await prisma.account.create({
      data: {
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password: passwordHash,
      },
    });
  }

  console.log(`✔ Administrador listo: ${email}`);
  return admin;
}

async function seedEvent(ownerId: string) {
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

  // ownerId solo se fija al crear: si el evento ya existe puede haberse
  // reasignado a otra cuenta a propósito y el seed no debe deshacerlo.
  const event = existing
    ? await prisma.event.update({ where: { id: existing.id }, data })
    // originalDate ancla la regla de cambio de fecha y solo se fija al crear.
    // El slug va solo aquí, en el alta: es la ruta pública del evento y
    // reescribirla en un evento que ya existe rompería las invitaciones que ya
    // se enviaron. El resto de campos sí se refrescan.
    : await prisma.event.create({
        data: {
          ...data,
          ownerId,
          slug: "maya-29",
          originalDate: data.date,
          shareCode: newShareCode(),
        },
      });

  console.log(`✔ Evento listo: ${event.name}`);
  return event;
}

async function seedInvitations(eventId: string) {
  for (const seed of EVENT_SLUG_SEEDS) {
    const invitation = await prisma.invitation.upsert({
      // El slug del invitado es único dentro de su evento, así que la clave
      // para reconocerlo son los dos campos juntos.
      where: { eventId_slug: { eventId, slug: seed.slug } },
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
  const admin = await seedAdmin();
  if (!admin) {
    throw new Error(
      "Sin ADMIN_EMAIL / ADMIN_PASSWORD no se puede sembrar el evento: todo evento necesita una cuenta dueña."
    );
  }

  const event = await seedEvent(admin.id);
  if (withDemoInvitations) {
    await seedInvitations(event.id);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  if (withDemoInvitations) {
    console.log(`\n→ Invitación de ejemplo: ${base}/e/${event.slug}/i/mariana-lopez`);
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
