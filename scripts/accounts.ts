/**
 * Alta y mantenimiento de cuentas del panel.
 *
 * No hay registro público a propósito: las cuentas las crea el equipo, y el
 * cupo de eventos es la palanca comercial (se sube al cobrar). Este script es
 * la única vía para ambas cosas.
 *
 *   npx tsx scripts/accounts.ts list
 *   npx tsx scripts/accounts.ts create --email ana@cliente.mx --password "…" --quota 1 --name "Ana"
 *   npx tsx scripts/accounts.ts quota  --email ana@cliente.mx --quota 3
 *   npx tsx scripts/accounts.ts password --email ana@cliente.mx --password "…"
 */
import "./env";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno. Copia .env.example a .env.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Lee --clave valor de argv. */
function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function requireFlag(name: string): string {
  const value = flag(name);
  if (!value) {
    throw new Error(`Falta --${name}`);
  }
  return value;
}

function requireEmail(): string {
  return requireFlag("email").trim().toLowerCase();
}

function parseQuota(raw: string): number {
  const quota = Number(raw);
  if (!Number.isInteger(quota) || quota < 0) {
    throw new Error("--quota debe ser un entero mayor o igual que 0");
  }
  return quota;
}

async function list() {
  const accounts = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { events: true } } },
  });

  if (accounts.length === 0) {
    console.log("No hay cuentas todavía.");
    return;
  }

  for (const account of accounts) {
    // Solo los eventos sin archivar consumen cupo.
    const active = await prisma.event.count({
      where: { ownerId: account.id, archivedAt: null },
    });
    const badge = account.isSuperAdmin ? " [superadmin]" : "";
    console.log(
      `${account.email}${badge}\n` +
        `  cupo: ${active}/${account.eventQuota} activos · ${account._count.events} eventos en total\n`
    );
  }
}

async function create() {
  const email = requireEmail();
  const password = requireFlag("password");
  const quota = parseQuota(flag("quota") ?? "1");
  const name = flag("name") ?? null;

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Ya existe una cuenta con ${email}. Usa "quota" o "password" para cambiarla.`);
  }

  await prisma.adminUser.create({
    data: { email, name, eventQuota: quota, passwordHash: await bcrypt.hash(password, 12) },
  });

  console.log(`✔ Cuenta creada: ${email} · cupo de ${quota} evento(s) activo(s)`);
}

async function setQuota() {
  const email = requireEmail();
  const quota = parseQuota(requireFlag("quota"));

  const account = await prisma.adminUser.update({
    where: { email },
    data: { eventQuota: quota },
  });

  const active = await prisma.event.count({ where: { ownerId: account.id, archivedAt: null } });
  console.log(`✔ ${email}: cupo ${quota} (usa ${active})`);

  if (active > quota) {
    // Bajar el cupo no archiva nada: los eventos de más siguen vivos, pero la
    // cuenta no podrá crear otro hasta archivarlos.
    console.warn(
      `⚠  Tiene ${active} eventos activos, más que su cupo. No se archiva ninguno; simplemente no podrá crear más.`
    );
  }
}

async function setPassword() {
  const email = requireEmail();
  const password = requireFlag("password");

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  await prisma.adminUser.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  console.log(`✔ Contraseña actualizada para ${email}`);
}

const COMMANDS: Record<string, () => Promise<void>> = {
  list,
  create,
  quota: setQuota,
  password: setPassword,
};

async function main() {
  const command = process.argv[2];
  const run = command ? COMMANDS[command] : undefined;

  if (!run) {
    console.error(
      `Uso: npx tsx scripts/accounts.ts <${Object.keys(COMMANDS).join("|")}> [--email …] [--password …] [--quota …] [--name …]`
    );
    process.exitCode = 1;
    return;
  }

  await run();
}

main()
  .catch((error: unknown) => {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
