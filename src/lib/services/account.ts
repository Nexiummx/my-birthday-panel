import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { hasPassword, setUserPassword, verifyUserPassword } from "@/lib/services/credentials";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/validations";

/** Datos de la cuenta para la pantalla "Mi cuenta". */
export async function getAccount(id: string) {
  return prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      eventQuota: true,
      eventsUsed: true,
      createdAt: true,
    },
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

  // Quien entró solo con Google todavía no tiene contraseña que comprobar.
  if (!(await hasPassword(id))) {
    throw new ServiceError(
      "Tu cuenta entra con Google y todavía no tiene contraseña. Usa \"olvidé mi contraseña\" para crear una.",
      409
    );
  }

  if (!(await verifyUserPassword(id, password))) {
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
    data: { email: input.email, name: input.name?.trim() ?? "" },
    select: { id: true, email: true, name: true },
  });
}

/**
 * Cambia la contraseña y **cierra las demás sesiones**.
 *
 * Lo segundo es la mitad del valor de lo primero. Quien cambia su contraseña
 * casi siempre lo hace porque cree que alguien más entró; si la sesión de ese
 * alguien sigue viva, cambiarla no sirve de nada. Better Auth guarda las
 * sesiones en base justo para que se puedan revocar de verdad.
 *
 * La sesión desde la que se está haciendo el cambio se conserva: cerrar la
 * propia obligaría a volver a entrar en el mismo momento en que se acaba de
 * demostrar quién eres, y solo se leería como un fallo.
 */
export async function changePassword(
  id: string,
  input: ChangePasswordInput,
  currentSessionToken?: string
) {
  await assertPassword(id, input.currentPassword);
  await setUserPassword(id, input.newPassword);

  const { count } = await prisma.session.deleteMany({
    where: {
      userId: id,
      ...(currentSessionToken ? { token: { not: currentSessionToken } } : {}),
    },
  });

  return { closedSessions: count };
}
