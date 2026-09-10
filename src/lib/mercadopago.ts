import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente de Mercado Pago, por REST y sin SDK.
 *
 * Son tres llamadas —crear preferencia, leer pago, y ya— y el SDK oficial
 * arrastra dependencias y su propia forma de configurarse. Es la misma decisión
 * que se tomó con Supabase Storage, por la misma razón.
 *
 * Mercado Pago y no Stripe porque esto se vende en México: aquí la mitad de la
 * gente paga con tarjeta de débito, con transferencia SPEI o en efectivo en un
 * OXXO, y Checkout Pro trae los tres. Stripe no cobra en OXXO sin trámite.
 */

const API = "https://api.mercadopago.com";

/**
 * Las credenciales se leen al usarlas, no al cargar el módulo.
 *
 * Una constante de nivel de módulo captura el valor una sola vez, y eso ata la
 * configuración al primer import: no se puede probar sin recargar el módulo
 * entero, y cambiar la variable exige reiniciar el proceso. Leerlas aquí cuesta
 * lo mismo y no tiene ninguna de las dos pegas.
 */
const accessToken = () => process.env.MERCADOPAGO_ACCESS_TOKEN;
const webhookSecret = () => process.env.MERCADOPAGO_WEBHOOK_SECRET;

/**
 * Si no hay credenciales, el cobro automático simplemente no existe y el panel
 * sigue enseñando el camino de siempre: escribir por WhatsApp y que el equipo
 * suba el cupo a mano. Nunca revienta por falta de configuración.
 */
export function mercadoPagoIsConfigured(): boolean {
  return Boolean(accessToken());
}

function requireToken(): string {
  const token = accessToken();
  if (!token) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  }
  return token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Nunca se cachea: son operaciones de dinero.
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // El detalle va al log del servidor, no a la respuesta del cliente: puede
    // traer datos de la cuenta de cobro.
    console.error(`Mercado Pago ${path} → ${response.status}`, detail.slice(0, 500));
    throw new Error(`Mercado Pago respondió ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface PreferenceInput {
  /** Nuestro id de cobro. Vuelve en el pago y es como lo reconocemos. */
  externalReference: string;
  title: string;
  /** En pesos, no en centavos: es lo que espera su API. */
  amount: number;
  currency: string;
  payerEmail: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export interface Preference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createPreference(input: PreferenceInput): Promise<Preference> {
  return call<Preference>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: input.externalReference,
          title: input.title,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: "approved",
      notification_url: input.notificationUrl,
      // El cobro en efectivo (OXXO) tarda hasta tres días en confirmarse. Se
      // deja activo a propósito: es como paga mucha gente aquí, y el aviso del
      // webhook nos avisará cuando llegue.
      binary_mode: false,
      statement_descriptor: "INVITACIONES",
    }),
  });
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export async function getPayment(id: string): Promise<MercadoPagoPayment> {
  return call<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

/**
 * Comprueba que el aviso lo mandó Mercado Pago y no cualquiera que conozca la
 * URL.
 *
 * La firma va en la cabecera `x-signature` como `ts=...,v1=...`, y lo firmado
 * es `id:<id>;request-id:<x-request-id>;ts:<ts>;`. Sin esta comprobación,
 * cualquiera podría mandarnos un aviso inventado; lo único que lo salva es que
 * después SIEMPRE preguntamos el pago a la API antes de acreditar nada.
 *
 * Sin secreto configurado devuelve false: es preferible rechazar el aviso a
 * aceptar lo que llegue.
 */
export function verifyNotification(
  headers: Headers,
  dataId: string
): { ok: boolean; reason?: string } {
  const secret = webhookSecret();
  if (!secret) {
    return { ok: false, reason: "Falta MERCADOPAGO_WEBHOOK_SECRET" };
  }

  const signature = headers.get("x-signature");
  const requestId = headers.get("x-request-id") ?? "";
  if (!signature) {
    return { ok: false, reason: "Sin cabecera x-signature" };
  }

  const parts = Object.fromEntries(
    signature.split(",").map((piece) => {
      const [key, ...rest] = piece.trim().split("=");
      return [key, rest.join("=")];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return { ok: false, reason: "Firma incompleta" };
  }

  // Los ids alfanuméricos van en minúscula en el manifiesto; los numéricos no
  // cambian al pasarlos a minúscula, así que se aplica siempre.
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  // Longitudes distintas hacen que timingSafeEqual lance en vez de devolver
  // false, así que se comprueba antes.
  const matches = a.length === b.length && timingSafeEqual(a, b);
  return matches ? { ok: true } : { ok: false, reason: "La firma no coincide" };
}
