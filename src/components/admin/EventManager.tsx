"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CalendarPlus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { EventFormModal } from "@/components/admin/EventFormModal";
import { planForQuota } from "@/lib/pricing";
import { getTheme } from "@/lib/themes";
import type { AdminEvent } from "@/lib/admin-event";
import type { EventThemeValue } from "@/lib/validations";
import { cn } from "@/lib/utils";

interface Quota {
  limit: number;
  used: number;
  available: number;
}

export function EventManager({
  events,
  activeEventId,
  quota,
}: {
  events: AdminEvent[];
  activeEventId: string | null;
  quota: Quota;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  /** Llama a la API y refresca; devuelve el mensaje de error si lo hubo. */
  const send = async (id: string, init: RequestInit) => {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/events/${id}`, init);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "No se pudo completar la acción");
        return;
      }
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const activate = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await fetch("/api/events/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = (event: AdminEvent) =>
    send(event.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !event.archived }),
    });

  const remove = (event: AdminEvent) => {
    // Que borrar no devuelva el crédito tiene que decirse antes, no después:
    // es lo primero que alguien supone al ver un botón de eliminar.
    const warning = [
      event.invitationCount > 0
        ? `Se eliminarán también sus ${event.invitationCount} invitaciones y las respuestas que ya hayan enviado.`
        : null,
      "Borrarlo no te devuelve el crédito del evento.",
      "Esto no se puede deshacer.",
    ]
      .filter(Boolean)
      .join(" ");
    if (!confirm(`¿Eliminar “${event.name}”?\n\n${warning}`)) return;
    return send(event.id, { method: "DELETE" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-ink-500">
          Plan {planForQuota(quota.limit)?.name ?? "sin activar"}: {quota.used} de {quota.limit}{" "}
          {quota.limit === 1 ? "evento usado" : "eventos usados"}.{" "}
          {quota.available === 0 && (
            <span className="text-ink-700">
              Archivar no devuelve el crédito; para otra fiesta hace falta ampliar tu plan.
            </span>
          )}
        </p>

        <Button
          onClick={() => setCreating(true)}
          disabled={quota.available === 0}
          icon={<CalendarPlus className="size-4" aria-hidden="true" />}
          size="sm"
        >
          Crear evento
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="size-8" aria-hidden="true" />}
          title="Todavía no tienes eventos"
          description="Crea el primero para elegir tema y empezar a enviar invitaciones."
          action={
            <Button onClick={() => setCreating(true)} size="sm" className="mt-2">
              Crear evento
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const theme = getTheme(event.theme as EventThemeValue);
            const isActive = event.id === activeEventId;
            const busy = busyId === event.id;

            return (
              <li
                key={event.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors sm:p-5",
                  isActive ? "border-olive-600 bg-olive-600/6" : "border-cream-200 bg-cream-50",
                  event.archived && "opacity-70"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-10 shrink-0 overflow-hidden rounded-xl border border-cream-300"
                      title={theme.label}
                    >
                      <span className="w-1/2" style={{ background: theme.swatch[0] }} />
                      <span className="flex w-1/2 flex-col">
                        <span className="h-1/2" style={{ background: theme.swatch[1] }} />
                        <span className="h-1/2" style={{ background: theme.swatch[2] }} />
                      </span>
                    </span>

                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-serif text-lg text-ink-900">
                        {event.name}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-olive-600/12 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-olive-700">
                            <Check className="size-3" aria-hidden="true" />
                            En edición
                          </span>
                        )}
                        {event.archived && (
                          <span className="rounded-full bg-cream-200 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-ink-500">
                            Archivado
                          </span>
                        )}
                      </p>
                      <p className="mt-1 font-sans text-sm text-ink-500">
                        {event.dateLabel} · {event.time} · {event.location.split("\n")[0]}
                      </p>
                      <p className="mt-0.5 font-sans text-xs text-ink-500">
                        {theme.label} ·{" "}
                        {event.invitationCount === 1
                          ? "1 invitación"
                          : `${event.invitationCount} invitaciones`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isActive && !event.archived && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => activate(event.id)}
                        loading={busy}
                      >
                        Trabajar en este
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(event)}
                      icon={<Pencil className="size-3.5" aria-hidden="true" />}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleArchive(event)}
                      loading={busy}
                      icon={
                        event.archived ? (
                          <ArchiveRestore className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Archive className="size-3.5" aria-hidden="true" />
                        )
                      }
                    >
                      {event.archived ? "Reactivar" : "Archivar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(event)}
                      loading={busy}
                      aria-label={`Eliminar ${event.name}`}
                      className="text-blush-500 hover:bg-blush-200/50"
                      icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <EventFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={refresh}
      />
      <EventFormModal
        open={editing !== null}
        event={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}
