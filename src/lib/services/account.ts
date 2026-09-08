import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ServiceError } from "@/lib/services/errors";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/validations";

/** Datos de la cuenta para la pantalla "Mi cuenta". */
export async function getAccount(id: string) {
  return prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, eventQuota: true, createdAt: true },
  });
}

/**
 * Comprueba la contraseña actual del titular.
 *
 * Toda operación que cambia las credenciales pasa por aquí: tener la sesión
 * abierta no basta para apropiarse de la cuenta, y mientras no haya correo
 * configurado tampoco hay forma de recuperarla.
 */
async function assertPassword(id: string, password: string) {
  const account = await prisma.adminUser.findUnique({ where: { id } });
  if (!account) {
    throw new ServiceError("La cuenta no existe", 404);
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    throw new ServiceError("La contraseña no es correcta", 401);
  }

  return account;
}

export async function updateProfile(id: string, input: UpdateProfileInput) {
  await assertPassword(id, input.currentPassword);

  if (input.email) {
    const taken = await prisma.adminUser.findUnique({ where: { email: input.email } });
    if (taken && taken.id !== id) {
      throw new ServiceError("Ese correo ya está en uso por otra cuenta", 409);
    }
  }

  return prisma.adminUser.update({
    where: { id },
    data: { email: input.email, name: input.name?.trim() || null },
    select: { id: true, email: true, name: true },
  });
}

export async function changePassword(id: string, input: ChangePasswordInput) {
  await assertPassword(id, input.currentPassword);

  await prisma.adminUser.update({
    where: { id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
