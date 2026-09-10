"use client";

import { useState } from "react";
import { CreditCard, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * El botón que lleva a pagar con Mercado Pago.
 *
 * Solo aparece dentro del panel y con las credenciales configuradas. En la
 * portada pública no: primero hay que tener cuenta, porque el cobro se acredita
 * a una cuenta concreta y sin ella no habría a quién darle los créditos.
 *
 * No lleva el precio en la petición —solo el id del plan— a propósito: el
 * importe sale del catálogo del servidor. Ver /api/pagos/checkout.
 */
export function PlanCheckoutButton({
  planId,
  label,
  featured,
}: {
  planId: string;
  label: string;
  featured?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/pagos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { url?: string }; error?: string }
        | null;

      if (!response.ok || !payload?.data?.url) {
        setError(payload?.error ?? "No se pudo abrir el pago");
        return;
      }
      // Se sale del sitio: no se vuelve, así que no hace falta apagar `busy`.
      window.location.href = payload.data.url;
    } catch {
      setError("No se pudo abrir el pago. Revisa tu conexión.");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={cn(
          "mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-sans text-sm font-medium transition-colors disabled:opacity-60",
          featured
            ? "bg-olive-600 text-cream-50 hover:bg-olive-700"
            : "border border-cream-300 text-ink-700 hover:border-gold-400 hover:text-ink-900"
        )}
      >
        <CreditCard className="size-4" aria-hidden="true" />
        {busy ? "Abriendo…" : label}
      </button>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 font-sans text-xs text-blush-500">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </>
  );
}
