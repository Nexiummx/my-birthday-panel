import { NextResponse } from "next/server";
import { verifyNotification } from "@/lib/mercadopago";
import { applyPaymentNotification } from "@/lib/services/payments";

/**
 * Aviso de Mercado Pago. **Aquí es donde se dan los créditos, y solo aquí.**
 *
 * La URL de vuelta del navegador no sirve para acreditar nada: la controla
 * quien paga, y cualquiera puede escribir `/admin/pago?estado=exito` a mano.
 * Esto, en cambio, es servidor a servidor, va firmado, y encima le volvemos a
 * preguntar a Mercado Pago cómo quedó el pago antes de tocar el cupo.
 *
 * Siempre se responde 200, incluso cuando el aviso no nos sirve. Un 4xx hace
 * que Mercado Pago reintente durante horas un aviso que nunca vamos a poder
 * procesar; el 401 se reserva para la firma inválida, que sí es un problema
 * suyo o de un impostor.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);

  // El id llega en el cuerpo o en la query, según el tipo de aviso.
  let bodyId: string | null = null;
  let type: string | null = url.searchParams.get("type");
  try {
    const body = (await request.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };
    bodyId = body.data?.id != null ? String(body.data.id) : null;
    type = type ?? body.type ?? body.action?.split(".")[0] ?? null;
  } catch {
    /* algunos avisos vienen sin cuerpo */
  }

  const dataId = bodyId ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!dataId) {
    return NextResponse.json({ ignored: "sin id" });
  }

  const signature = verifyNotification(request.headers, dataId);
  if (!signature.ok) {
    console.warn("[pagos] aviso rechazado:", signature.reason);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  // Solo interesan los pagos. Mercado Pago avisa también de contracargos,
  // suscripciones y movimientos de la cuenta.
  if (type && type !== "payment") {
    return NextResponse.json({ ignored: type });
  }

  try {
    const result = await applyPaymentNotification(dataId);
    return NextResponse.json(result);
  } catch (error) {
    // Un 500 sí conviene: Mercado Pago reintenta, y si lo que falló fue una
    // caída pasajera de la base, el reintento acredita el pago que si no se
    // habría perdido.
    console.error("[pagos] no se pudo procesar el aviso", error);
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
  }
}
