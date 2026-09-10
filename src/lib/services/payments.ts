import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { createPreference, getPayment, mercadoPagoIsConfigured } from "@/lib/mercadopago";
import { PLANS } from "@/lib/pricing";
import { siteUrl } from "@/lib/utils";

/**
 * Cobros y acreditación de créditos.
 *
 * Dos reglas gobiernan todo lo de aquí, y las dos existen porque cobrar mal se
 * paga con dinero de verdad:
 *
 *   1. **Los créditos NUNCA se dan desde el navegador.** La URL de vuelta de
 *      Mercado Pago la controla quien paga: cualquiera puede escribir
 *      `/admin/pago/exito` en la barra de direcciones. Los créditos se dan solo
 *      cuando el aviso servidor-a-servidor llega Y le preguntamos a Mercado
 *      Pago cómo quedó ese pago.
 *   2. **Acreditar es idempotente.** El aviso llega repetido —siempre— y a
 *      veces dos veces a la vez. Quien lo impide de verdad no es un `if`, es la
 *      restricción de unicidad sobre `providerId` en la base.
 */

/** Estados de Mercado Pago traducidos a los nuestros. */
function mapStatus(status: string) {
  switch (status) {
    case "approved":
      return "APPROVED" as const;
    case "rejected":
      return "REJECTED" as const;
    case "refunded":
    case "charged_back":
      return "REFUNDED" as const;
    case "cancelled":
      return "CANCELLED" as const;
    default:
      // in_process, pending, authorized: un OXXO tarda hasta tres días.
      return "PENDING" as const;
  }
}

export function planById(id: string) {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

/**
 * Crea el cobro y devuelve a dónde mandar al cliente.
 *
 * La fila se guarda ANTES de hablar con Mercado Pago, en PENDING. Así el aviso
 * siempre encuentra a quién acreditarle, incluso si llega antes de que el
 * navegador vuelva —que con transferencia SPEI pasa.
 */
export async function startCheckout(ownerId: string, planId: string) {
  if (!mercadoPagoIsConfigured()) {
    throw new ServiceError(
      "El pago en línea todavía no está activo. Escríbenos y lo activamos a mano.",
      503
    );
  }

  const plan = planById(planId);
  if (!plan) {
    throw new ServiceError("Ese plan no existe", 404);
  }

  const owner = await prisma.adminUser.findUnique({
    where: { id: ownerId },
    select: { id: true, email: true },
  });
  if (!owner) {
    throw new ServiceError("La cuenta no existe", 404);
  }

  const payment = await prisma.payment.create({
    data: {
      ownerId,
      planId: plan.id,
      // Nombre, créditos e importe se copian del catálogo: si mañana sube el
      // precio, este cobro tiene que seguir diciendo lo que se cobró hoy.
      planName: plan.name,
      credits: plan.quota,
      amountCents: plan.price * 100,
    },
  });

  const base = siteUrl();
  const preference = await createPreference({
    externalReference: payment.id,
    title: `Invitaciones digitales · ${plan.name}`,
    amount: plan.price,
    currency: "MXN",
    payerEmail: owner.email,
    successUrl: `${base}/admin/pago?estado=exito`,
    failureUrl: `${base}/admin/pago?estado=error`,
    pendingUrl: `${base}/admin/pago?estado=pendiente`,
    notificationUrl: `${base}/api/pagos/mercadopago`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { preferenceId: preference.id },
  });

  return { paymentId: payment.id, url: preference.init_point };
}

/**
 * Procesa un aviso de Mercado Pago.
 *
 * Se le pregunta a su API por el pago en vez de creerle al cuerpo del aviso: el
 * aviso solo trae un id, y aunque la firma ya se comprobó, el estado tiene que
 * salir de la fuente y no de lo que alguien nos mande.
 */
export async function applyPaymentNotification(providerPaymentId: string) {
  const remote = await getPayment(providerPaymentId);
  const reference = remote.external_reference;

  if (!reference) {
    // Un pago sin nuestra referencia no es nuestro. No es un error: Mercado
    // Pago avisa de todo lo que pasa en la cuenta.
    return { handled: false, reason: "sin referencia" };
  }

  const payment = await prisma.payment.findUnique({ where: { id: reference } });
  if (!payment) {
    return { handled: false, reason: "referencia desconocida" };
  }

  const status = mapStatus(remote.status);

  // Todo dentro de una transacción: sumar el cupo y marcar el cobro como
  // acreditado tienen que pasar juntos o no pasar.
  return prisma.$transaction(async (tx) => {
    // `providerId` es único en la base. Si otro aviso simultáneo ya lo escribió,
    // este update falla y no se acredita dos veces. `creditedAt` es el segundo
    // cerrojo: una vez puesto, no se vuelve a sumar aunque lleguen diez avisos.
    const alreadyCredited = payment.creditedAt !== null;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        providerId: String(remote.id),
        providerStatus: remote.status_detail || remote.status,
      },
    });

    if (status !== "APPROVED" || alreadyCredited) {
      return { handled: true, credited: false, status };
    }

    await tx.adminUser.update({
      where: { id: payment.ownerId },
      data: { eventQuota: { increment: payment.credits } },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { creditedAt: new Date() },
    });

    return { handled: true, credited: true, status, credits: payment.credits };
  });
}

/** Los cobros de una cuenta. Es el libro de dónde salió cada crédito. */
export async function listPayments(ownerId: string) {
  return prisma.payment.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
