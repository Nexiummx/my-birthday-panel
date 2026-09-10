import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, CircleCheck, CircleX } from "lucide-react";
import { getQuota } from "@/lib/services/events";
import { listPayments } from "@/lib/services/payments";
import { requirePanelContext } from "@/lib/panel";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago · Panel",
  robots: { index: false, follow: false },
};

const ESTADOS = {
  exito: {
    icon: CircleCheck,
    tone: "text-olive-600",
    title: "Pago recibido",
    body: "Estamos confirmándolo con Mercado Pago. En cuanto quede, tus créditos aparecen aquí solos.",
  },
  pendiente: {
    icon: Clock,
    tone: "text-gold-500",
    title: "Tu pago está en camino",
    body: "Si pagaste en efectivo o por transferencia, tarda en confirmarse: hasta tres días hábiles con un pago en OXXO. No hace falta que hagas nada más.",
  },
  error: {
    icon: CircleX,
    tone: "text-blush-500",
    title: "El pago no se completó",
    body: "No se te cobró nada. Puedes intentarlo otra vez o escribirnos si prefieres pagar por transferencia.",
  },
} as const;

type Estado = keyof typeof ESTADOS;

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Acreditado",
  REJECTED: "Rechazado",
  REFUNDED: "Devuelto",
  CANCELLED: "Cancelado",
};

/**
 * Lo que se ve al volver de Mercado Pago.
 *
 * Esta pantalla **no acredita nada**: la URL de vuelta la controla quien paga y
 * cualquiera puede escribirla a mano. Los créditos los da el aviso firmado que
 * llega a /api/pagos/mercadopago. Aquí solo se cuenta lo que está pasando y se
 * enseña el cupo real, que es el que manda.
 */
export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { session } = await requirePanelContext();
  const { estado } = await searchParams;

  const [quota, payments] = await Promise.all([
    getQuota(session.sub),
    listPayments(session.sub),
  ]);

  const key: Estado = estado === "error" || estado === "pendiente" ? estado : "exito";
  const info = ESTADOS[key];
  const Icon = info.icon;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-cream-200 bg-cream-50 px-6 py-8 text-center">
        <Icon className={`mx-auto size-8 ${info.tone}`} aria-hidden="true" />
        <h1 className="mt-3 font-serif text-2xl font-light text-forest-800">{info.title}</h1>
        <p className="mx-auto mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-500">
          {info.body}
        </p>

        <p className="mt-5 font-sans text-sm text-ink-700">
          Ahora mismo tienes{" "}
          <strong>
            {quota.available} {quota.available === 1 ? "crédito" : "créditos"}
          </strong>{" "}
          sin usar, de {quota.limit}.
        </p>

        <Link
          href="/admin/evento"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-olive-600 px-6 py-3 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
        >
          Ir a mis eventos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {payments.length > 0 && (
        <section aria-labelledby="movimientos" className="space-y-3">
          <h2 id="movimientos" className="font-serif text-xl text-ink-900">
            Tus pagos
          </h2>
          {/* El libro de dónde salió cada crédito. Sin esto, un cupo de 3 no se
              puede explicar a un cliente que reclama. */}
          <div className="overflow-x-auto rounded-2xl border border-cream-200">
            <table className="w-full min-w-[32rem] font-sans text-sm">
              <thead className="bg-cream-100/60 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Importe</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-cream-200">
                    <td className="px-4 py-3 text-ink-500">{formatDateTime(payment.createdAt)}</td>
                    <td className="px-4 py-3 text-ink-900">{payment.planName}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-700">
                      ${(payment.amountCents / 100).toLocaleString("es-MX")} {payment.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          payment.creditedAt
                            ? "text-olive-700"
                            : payment.status === "PENDING"
                              ? "text-gold-600"
                              : "text-blush-500"
                        }
                      >
                        {ETIQUETA_ESTADO[payment.status] ?? payment.status}
                        {payment.creditedAt && ` · +${payment.credits}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
