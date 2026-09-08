import "server-only";
import { prisma } from "@/lib/prisma";
import { setUserPassword } from "@/lib/services/credentials";
import { ServiceError } from "@/lib/services/errors";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validations";

/**
 * Gestión de cuentas de clientes. Es el equivalente en panel de
 * scripts/accounts.ts, y solo lo alcanzan las cuentas con isSuperAdmin.
 *
 * Ojo con la diferencia frente a services/account.ts: aquel es autoservicio
 * —el titular cambia sus propios datos— y este es administración de terceros,
 * así que aquí NO se pide la contraseña del titular: se restablece.
 */

/** Lanza si la cuenta en sesión no es superadmin. */
export async function requireSuperAdmin(ownerId: string) {
  const account = await prisma.adminUser.findUnique({
    where: { id: ownerId },
    select: { isSuperAdmin: true },
  });

  if (!account?.isSuperAdmin) {
    // 404 y no 403: a quien no es superadmin no se le confirma que exista.
    throw new ServiceError("No encontrado", 404);
  }
}

export async function isSuperAdmin(ownerId: string) {
  const account = await prisma.adminUser.findUnique({
    where: { id: ownerId },
    select: { isSuperAdmin: true },
  });
  return account?.isSuperAdmin ?? false;
}

export type AccountRecord = Awaited<ReturnType<typeof listAccounts>>[number];

export async function listAccounts() {
  const accounts = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      eventQuota: true,
      isSuperAdmin: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });

  // Solo los eventos sin archivar consumen cupo, así que el recuento del
  // include no sirve: hay que contarlos aparte.
  const active = await prisma.event.groupBy({
    by: ["ownerId"],
    where: { archivedAt: null },
    _count: { _all: true },
  });

  const activeBy = new Map(active.map((row) => [row.ownerId, row._count._all]));

  return accounts.map((account) => ({
    ...account,
    activeEvents: activeBy.get(account.id) ?? 0,
  }));
}

export async function createAccount(input: CreateAccountInput) {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ServiceError("Ya existe una cuenta con ese correo", 409);
  }

  const account = await prisma.adminUser.create({
    data: {
      email: input.email,
      name: input.name?.trim() ?? "",
      eventQuota: input.eventQuota,
      isSuperAdmin: input.isSuperAdmin ?? false,
      // La cuenta la crea el equipo, así que el correo se da por bueno.
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, eventQuota: true },
  });

  await setUserPassword(account.id, input.password);
  return account;
}

export async function updateAccount(id: string, actorId: string, input: UpdateAccountInput) {
  const account = await prisma.adminUser.findUnique({ where: { id } });
  if (!account) {
    throw new ServiceError("La cuenta no existe", 404);
  }

  if (input.email && input.email !== account.email) {
    const taken = await prisma.adminUser.findUnique({ where: { email: input.email } });
    if (taken) {
      throw new ServiceError("Ese correo ya está en uso por otra cuenta", 409);
    }
  }

  // Quitarse a uno mismo el superadmin deja la instalación sin quien administre
  // si es el único; más simple y seguro: nadie se lo quita a sí mismo.
  if (id === actorId && input.isSuperAdmin === false) {
    throw new ServiceError("No puedes quitarte a ti mismo el acceso de superadmin", 400);
  }

  if (input.password) {
    await setUserPassword(id, input.password);
  }

  return prisma.adminUser.update({
    where: { id },
    data: {
      email: input.email,
      name: input.name === undefined ? undefined : input.name.trim(),
      eventQuota: input.eventQuota,
      isSuperAdmin: input.isSuperAdmin,
    },
    select: { id: true, email: true, name: true, eventQuota: true },
  });
}

export async function deleteAccount(id: string, actorId: string) {
  if (id === actorId) {
    throw new ServiceError("No puedes eliminar tu propia cuenta", 400);
  }

  const account = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!account) {
    throw new ServiceError("La cuenta no existe", 404);
  }

  // Cascada: se lleva sus eventos, invitaciones y respuestas.
  await prisma.adminUser.delete({ where: { id } });
}
