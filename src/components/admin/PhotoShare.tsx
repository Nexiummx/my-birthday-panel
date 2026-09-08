"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Lo que el anfitrión reparte para que le lleguen fotos: el enlace y el QR
 * para imprimir en las mesas, más el interruptor para cerrar la subida.
 *
 * El SVG del QR lo genera el servidor a partir de una URL nuestra, así que
 * inyectarlo es seguro: no hay nada del usuario dentro.
 */
export function PhotoShare({
  eventId,
  uploadUrl,
  rewindUrl,
  qrSvg,
  enabled,
}: {
  eventId: string;
  uploadUrl: string;
  rewindUrl: string;
  qrSvg: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photosEnabled: !enabled }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const qrHref = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(qrSvg)))}`;

  return (
    <div className="grid gap-5 rounded-2xl border border-cream-200 bg-cream-50 p-5 sm:p-6 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-40 overflow-hidden rounded-xl border border-cream-200 bg-white p-2 [&>svg]:block [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <a
          href={qrHref}
          download="qr-fotos.svg"
          className="inline-flex items-center gap-1.5 font-sans text-xs text-olive-600 underline decoration-cream-300 underline-offset-4 hover:text-olive-700"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Descargar para imprimir
        </a>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl text-ink-900">
            <QrCode className="size-4 text-olive-600" aria-hidden="true" />
            Para que suban fotos
          </h2>
          <p className="mt-1 font-sans text-sm text-ink-500">
            Imprime el código en las mesas o manda el enlace por el grupo. No hace falta que
            tengan invitación: así también suben los acompañantes.
          </p>
        </div>

        <LinkRow
          label="Enlace para subir"
          value={uploadUrl}
          copied={copied === "subir"}
          onCopy={() => copy(uploadUrl, "subir")}
        />
        <LinkRow
          label="Enlace del recuerdo"
          value={rewindUrl}
          copied={copied === "recuerdo"}
          onCopy={() => copy(rewindUrl, "recuerdo")}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 pt-4">
          <p className="font-sans text-sm text-ink-500">
            {enabled
              ? "La subida está abierta."
              : "La subida está cerrada. Las fotos que ya hay se siguen viendo."}
          </p>
          <Button size="sm" variant="secondary" loading={busy} onClick={toggle}>
            {enabled ? "Cerrar subida" : "Abrir subida"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-ink-700">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-cream-200/60 px-3 py-2 font-sans text-xs text-ink-700">
          {value}
        </code>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          aria-label={`Copiar ${label.toLowerCase()}`}
          icon={
            copied ? (
              <Check className="size-3.5 text-olive-600" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )
          }
        />
      </div>
    </div>
  );
}
