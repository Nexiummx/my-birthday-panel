import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * Acceso por contraseña.
 *
 * Better Auth guarda la contraseña en una fila de `accounts` con
 * providerId "credential", no en el usuario: así una misma cuenta puede tener
 * a la vez contraseña y proveedores sociales. Estas funciones son el único
 * punto del servidor que toca esa fila.
 */
const CREDENTIAL = "credential";

export async function getCredential(userId: string) {
  return prisma.account.findFirst({
    where: { userId, providerId: CREDENTIAL },
    select: { id: true, password: true },
  });
}

/** true si la cuenta tiene contraseña (puede no tenerla si entró con Google). */
export async function hasPassword(userId: string) {
  return (await getCredential(userId)) !== null;
}

export async function verifyUserPassword(userId: string, password: string) {
  const credential = await getCredential(userId);
  if (!credential?.password) return false;
  return verifyPassword(password, credential.password);
}

/** Fija la contraseña, creando el acceso por credencial si aún no existía. */
export async function setUserPassword(userId: string, password: string) {
  const hash = await hashPassword(password);
  const credential = await getCredential(userId);

  if (credential) {
    await prisma.account.update({ where: { id: credential.id }, data: { password: hash } });
    return;
  }

  await prisma.account.create({
    data: { accountId: userId, providerId: CREDENTIAL, userId, password: hash },
  });
}
