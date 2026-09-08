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
 *   npx tsx scripts/accounts.ts super    --email tu@nexiummx.com --on
 *   npx tsx scripts/accounts.ts transfer --event "Maya · 29" --to ana@cliente.mx
 *
 * `super` es el arranque en frío: sin una cuenta con superadmin nadie puede
 * entrar a /admin/clientes, y esa marca no se puede dar desde el panel.
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

/**
 * Fija la contraseña de una cuenta.
 *
 * Vive en una fila de `accounts` con providerId "credential", no en el usuario:
 * así una misma cuenta puede tener a la vez contraseña y proveedores sociales.
 * El hash sigue siendo bcrypt, que es lo que la configuración de Better Auth
 * verifica.
 */
async function setCredential(userId: string, password: string) {
  const hash = await bcrypt.hash(password, 12);
  const existing = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data: { password: hash } });
    return;
  }

  await prisma.account.create({
    data: { accountId: userId, providerId: "credential", userId, password: hash },
  });
}

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
  const name = flag("name") ?? "";

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Ya existe una cuenta con ${email}. Usa "quota" o "password" para cambiarla.`);
  }

  const account = await prisma.adminUser.create({
    data: { email, name, eventQuota: quota, emailVerified: true },
  });

  await setCredential(account.id, password);

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

  const account = await prisma.adminUser.findUnique({ where: { email } });
  if (!account) {
    throw new Error(`No existe una cuenta con ${email}`);
  }

  await setCredential(account.id, password);
  console.log(`✔ Contraseña actualizada para ${email}`);
}

async function setSuper() {
  const email = requireEmail();
  const on = process.argv.includes("--on");
  const off = process.argv.includes("--off");

  if (on === off) {
    throw new Error("Indica --on o --off");
  }

  await prisma.adminUser.update({ where: { email }, data: { isSuperAdmin: on } });
  console.log(`✔ ${email}: superadmin ${on ? "activado" : "desactivado"}`);
}

/**
 * Cambia el dueño de un evento.
 *
 * Existe por la migración a multi-cuenta: los eventos anteriores quedaron a
 * nombre de la cuenta más antigua, que no tiene por qué ser la que de verdad
 * los gestiona. Antes que adivinarlo en la migración —donde no hay forma de
 * leer el entorno ni de deshacerlo— es preferible un comando explícito.
 */
async function transfer() {
  const needle = requireFlag("event");
  const email = requireFlag("to").trim().toLowerCase();

  const target = await prisma.adminUser.findUnique({ where: { email } });
  if (!target) {
    throw new Error(`No existe una cuenta con ${email}`);
  }

  // Se acepta el id exacto o parte del nombre, que es lo que uno recuerda.
  const matches = await prisma.event.findMany({
    where: { OR: [{ id: needle }, { name: { contains: needle, mode: "insensitive" } }] },
    include: { owner: { select: { email: true } }, _count: { select: { invitations: true } } },
  });

  if (matches.length === 0) {
    throw new Error(`Ningún evento coincide con "${needle}"`);
  }
  if (matches.length > 1) {
    throw new Error(
      `"${needle}" coincide con ${matches.length} eventos:\n` +
        matches.map((e) => `  ${e.id}  ${e.name}`).join("\n") +
        "\nRepite con el id exacto."
    );
  }

  const event = matches[0];
  if (event.ownerId === target.id) {
    console.log(`✔ "${event.name}" ya es de ${email}. Sin cambios.`);
    return;
  }

  await prisma.event.update({ where: { id: event.id }, data: { ownerId: target.id } });

  console.log(
    `✔ "${event.name}" (${event._count.invitations} invitaciones) pasó de ` +
      `${event.owner.email} a ${email}`
  );

  // El cupo es una guardarraíl comercial, no de integridad: se avisa pero no
  // se bloquea, porque el traspaso suele ser justo para arreglar un reparto.
  if (event.archivedAt === null) {
    const active = await prisma.event.count({
      where: { ownerId: target.id, archivedAt: null },
    });
    if (active > target.eventQuota) {
      console.warn(
        `⚠  ${email} queda con ${active} eventos activos y un cupo de ${target.eventQuota}. ` +
          `No podrá crear más hasta que le subas el cupo o archive alguno.`
      );
    }
  }
}

const COMMANDS: Record<string, () => Promise<void>> = {
  list,
  create,
  quota: setQuota,
  password: setPassword,
  super: setSuper,
  transfer,
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
