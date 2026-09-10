"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  MessageCircle,
  RotateCcw,
  Send,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import type { AdminInvitation } from "@/lib/admin-invitation";
import {
  INVITE_STAGES,
  STAGE_ACTIONS,
  STAGE_LABELS,
  type InviteStage,
} from "@/lib/invite-stage";
import { renderInviteMessage } from "@/lib/invite-message";
import { toWhatsApp, whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";

const STAGE_STYLES: Record<InviteStage, string> = {
  SIN_ENVIAR: "bg-cream-200 text-ink-700 border-cream-300",
  ENVIADA: "bg-gold-500/12 text-gold-600 border-gold-500/30",
  ABIERTA: "bg-olive-600/10 text-olive-700 border-olive-600/25",
  CONFIRMADA: "bg-olive-600/16 text-olive-700 border-olive-600/40",
  DECLINADA: "bg-blush-500/12 text-blush-500 border-blush-500/25",
};

/**
 * Pantalla de envío y seguimiento.
 *
 * Sustituye al "copia el enlace y pégalo en WhatsApp" de una en una. Cada fila
 * abre WhatsApp con el mensaje escrito y, si hay teléfono, con el chat del
 * invitado ya elegido.
 *
 * El embudo de arriba no es decoración: separa "no le ha llegado" de "la abrió
 * y no responde", que piden cosas distintas del anfitrión. Sin esa distinción,
 * lo único que puede hacer es insistirle a todo el mundo por igual.
 *
 * Marcar como enviada es manual a propósito. No podemos saber si mandó el
 * mensaje —WhatsApp se abre en otra aplicación y no nos cuenta nada—, así que
 * fingir certeza sería peor que pedirle un toque.
 */
export function SendBoard({
  invitations,
  eventName,
  eventDateLabel,
  template,
}: {
  invitations: AdminInvitation[];
  eventName: string;
  eventDateLabel: string;
  template: string | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<InviteStage | "TODAS">("TODAS");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result = Object.fromEntries(INVITE_STAGES.map((s) => [s, 0])) as Record<
      InviteStage,
      number
    >;
    for (const invitation of invitations) result[invitation.stage] += 1;
    return result;
  }, [invitations]);

  const visible = useMemo(
    () => (filter === "TODAS" ? invitations : invitations.filter((i) => i.stage === filter)),
    [invitations, filter]
  );

  const messageFor = (invitation: AdminInvitation) =>
    renderInviteMessage(template, {
      invitado: invitation.guestName,
      evento: eventName,
      fecha: eventDateLabel,
      enlace: invitation.url,
    });

  const setSent = async (ids: string[], sent: boolean) => {
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/invitations/enviadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, sent }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "No se pudo actualizar");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  /** Abre WhatsApp y, en el mismo gesto, la da por enviada. */
  const send = (invitation: AdminInvitation) => {
    window.open(whatsappLink(invitation.phone, messageFor(invitation)), "_blank", "noopener");
    if (invitation.stage === "SIN_ENVIAR") void setSent([invitation.id], true);
  };

  const copy = async (invitation: AdminInvitation) => {
    await navigator.clipboard.writeText(messageFor(invitation));
    setCopied(invitation.id);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const pendingIds = invitations.filter((i) => i.stage === "SIN_ENVIAR").map((i) => i.id);

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={<Send className="size-8" aria-hidden="true" />}
        title="Todavía no hay invitaciones"
        description="Crea o importa tu lista de invitados y desde aquí las mandas por WhatsApp."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* El embudo. Cada casilla filtra, así que además de informar, se usa. */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {INVITE_STAGES.map((stage) => (
          <li key={stage}>
            <button
              type="button"
              onClick={() => setFilter(filter === stage ? "TODAS" : stage)}
              aria-pressed={filter === stage}
              className={cn(
                "w-full rounded-2xl border p-3 text-left transition-colors",
                filter === stage
                  ? "border-olive-600 bg-olive-600/8"
                  : "border-cream-200 bg-cream-50 hover:border-cream-300"
              )}
            >
              <p className="font-serif text-2xl tabular-nums text-ink-900">{counts[stage]}</p>
              <p className="mt-0.5 font-sans text-[11px] leading-tight text-ink-500">
                {STAGE_LABELS[stage]}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-ink-500">
          {filter === "TODAS"
            ? `${invitations.length} invitaciones`
            : `${visible.length} en “${STAGE_LABELS[filter]}” · ${STAGE_ACTIONS[filter]}`}
          {filter !== "TODAS" && (
            <button
              type="button"
              onClick={() => setFilter("TODAS")}
              className="ml-2 underline decoration-cream-300 underline-offset-4 hover:text-ink-900"
            >
              ver todas
            </button>
          )}
        </p>

        {pendingIds.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy}
            onClick={() => setSent(pendingIds, true)}
            icon={<Check className="size-3.5" aria-hidden="true" />}
          >
            Marcar las {pendingIds.length} sin enviar como enviadas
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((invitation) => {
          const phone = toWhatsApp(invitation.phone);
          return (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-3 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-serif text-lg text-ink-900">
                  {invitation.guestName}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide",
                      STAGE_STYLES[invitation.stage]
                    )}
                  >
                    {STAGE_LABELS[invitation.stage]}
                  </span>
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-ink-500">
                  <span>
                    {invitation.guestCount === 1 ? "1 pase" : `${invitation.guestCount} pases`}
                  </span>

                  {invitation.phoneLabel ? (
                    <span className={cn(!phone.wa && "text-blush-500")}>
                      {invitation.phoneLabel}
                      {!phone.wa && " · no parece un teléfono"}
                    </span>
                  ) : (
                    <span className="text-ink-500/70">sin teléfono</span>
                  )}

                  {invitation.sentAtLabel && <span>Enviada {invitation.sentAtLabel}</span>}

                  {invitation.viewCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-olive-700">
                      <Eye className="size-3" aria-hidden="true" />
                      {invitation.viewCount === 1
                        ? "abierta 1 vez"
                        : `abierta ${invitation.viewCount} veces`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {invitation.stage !== "SIN_ENVIAR" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy}
                    onClick={() => setSent([invitation.id], false)}
                    aria-label={`Marcar la invitación de ${invitation.guestName} como no enviada`}
                    icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
                  />
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(invitation)}
                  aria-label={`Copiar el mensaje para ${invitation.guestName}`}
                  icon={
                    copied === invitation.id ? (
                      <Check className="size-3.5 text-olive-600" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )
                  }
                />

                <Button
                  size="sm"
                  variant={invitation.stage === "SIN_ENVIAR" ? "primary" : "secondary"}
                  onClick={() => send(invitation)}
                  icon={<MessageCircle className="size-3.5" aria-hidden="true" />}
                >
                  {invitation.stage === "SIN_ENVIAR" ? "Enviar" : "Reenviar"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-cream-300 px-4 py-10 text-center font-sans text-sm text-ink-500">
          Nadie en “{STAGE_LABELS[filter as InviteStage]}”. Buena señal.
        </p>
      )}

      <p className="flex items-start gap-2 font-sans text-xs text-ink-500">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        WhatsApp se abre en otra aplicación y no nos dice si llegaste a mandarlo, así que la
        invitación se marca como enviada al abrirlo. Si te arrepientes, puedes desmarcarla.
      </p>
    </div>
  );
}
