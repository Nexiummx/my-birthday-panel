"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Search, Undo2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/States";
import { Input } from "@/components/ui/Field";
import type { AdminInvitation } from "@/lib/admin-invitation";
import { cn } from "@/lib/utils";

/** Quita acentos y baja a minúsculas: en la puerta nadie escribe con tildes. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Lista de entrada, para el día del evento.
 *
 * Está pensada para usarse de pie, con una mano y con prisa, así que las
 * decisiones son distintas a las del resto del panel: los objetivos táctiles
 * son grandes, no hay confirmaciones que interrumpan, y todo lo que se hace se
 * puede deshacer de un toque — en la puerta se marca mal, y el error tiene que
 * costar un gesto, no una búsqueda.
 *
 * Cuenta PERSONAS, no invitaciones. Al anfitrión y al salón les importa cuánta
 * gente hay dentro, y una invitación de cuatro pases con dos que llegaron es un
 * dato distinto de una invitación marcada.
 */
export function DoorBoard({ invitations }: { invitations: AdminInvitation[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  const totals = useMemo(() => {
    const esperadas = invitations.filter((i) => i.status === "CONFIRMED");
    return {
      esperadas: esperadas.reduce((sum, i) => sum + (i.rsvpGuestCount ?? 0), 0),
      dentro: invitations.reduce((sum, i) => sum + i.checkedInCount, 0),
      invitacionesDentro: invitations.filter((i) => i.checkedIn).length,
      invitacionesEsperadas: esperadas.length,
    };
  }, [invitations]);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    return invitations
      .filter((invitation) => (onlyPending ? !invitation.checkedIn : true))
      .filter((invitation) => !needle || normalize(invitation.guestName).includes(needle))
      // Los que faltan primero: son los que hay que buscar en la puerta.
      .sort((a, b) => {
        if (a.checkedIn !== b.checkedIn) return a.checkedIn ? 1 : -1;
        return a.guestName.localeCompare(b.guestName, "es");
      });
  }, [invitations, query, onlyPending]);

  const setCount = async (invitation: AdminInvitation, count: number) => {
    const clamped = Math.max(0, Math.min(count, 20));
    setBusyId(invitation.id);
    try {
      await fetch(`/api/invitations/${invitation.id}/entrada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: clamped }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={<Check className="size-8" aria-hidden="true" />}
        title="No hay invitaciones"
        description="Cuando tengas tu lista, aquí pasas lista el día del evento."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-olive-600/30 bg-olive-600/8 p-4 text-center">
          <p className="font-serif text-4xl font-light text-olive-700">{totals.dentro}</p>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-wide text-ink-500">
            personas dentro
          </p>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 text-center">
          <p className="font-serif text-4xl font-light text-ink-900">{totals.esperadas}</p>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-wide text-ink-500">
            confirmadas
          </p>
        </div>
      </div>

      {/* Dos cifras separadas y no "X de Y": en una fiesta llega gente que no
          confirmó, y entonces el numerador supera al denominador y la frase se
          lee como un error del sistema. */}
      <p className="text-center font-sans text-xs text-ink-500">
        {totals.invitacionesDentro}{" "}
        {totals.invitacionesDentro === 1 ? "invitación ha llegado" : "invitaciones han llegado"} ·{" "}
        {totals.invitacionesEsperadas} confirmaron
      </p>

      <div className="sticky top-0 z-10 -mx-1 bg-cream-100/95 px-1 py-2 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar invitado"
            autoComplete="off"
            className="pl-9 text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar la búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-ink-500 hover:bg-cream-200"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <label className="mt-2 flex items-center gap-2 font-sans text-xs text-ink-500">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(event) => setOnlyPending(event.target.checked)}
            className="size-4 rounded border-cream-300"
          />
          Ocultar a quienes ya entraron
        </label>
      </div>

      <ul className="space-y-2">
        {visible.map((invitation) => {
          const busy = busyId === invitation.id;
          // Lo que se espera de esta invitación: lo que confirmó, y si no
          // respondió, sus pases. En la puerta aparece gente que no confirmó.
          const esperados = invitation.rsvpGuestCount ?? invitation.guestCount;

          return (
            <li
              key={invitation.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                invitation.checkedIn
                  ? "border-olive-600/40 bg-olive-600/8"
                  : "border-cream-200 bg-cream-50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg text-ink-900">{invitation.guestName}</p>
                <p className="font-sans text-xs text-ink-500">
                  {invitation.checkedIn
                    ? // Puede llegar más gente de la que cabía en su pase, y eso
                      // no es un error: es una fiesta. "4 de 2 dentro" sí lo
                      // parecería.
                      invitation.checkedInCount > esperados
                      ? `${invitation.checkedInCount} dentro · ${esperados} en su pase`
                      : `${invitation.checkedInCount} de ${esperados} dentro`
                    : invitation.status === "CONFIRMED"
                      ? `confirmó ${esperados}`
                      : `${invitation.guestCount} ${invitation.guestCount === 1 ? "pase" : "pases"} · sin confirmar`}
                </p>
              </div>

              {invitation.checkedIn ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Stepper
                    label={`Uno menos de ${invitation.guestName}`}
                    onClick={() => setCount(invitation, invitation.checkedInCount - 1)}
                    disabled={busy}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Stepper>
                  <span className="w-7 text-center font-serif text-xl text-olive-700">
                    {invitation.checkedInCount}
                  </span>
                  <Stepper
                    label={`Uno más de ${invitation.guestName}`}
                    onClick={() => setCount(invitation, invitation.checkedInCount + 1)}
                    disabled={busy}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Stepper>
                  <Stepper
                    label={`Deshacer la entrada de ${invitation.guestName}`}
                    onClick={() => setCount(invitation, 0)}
                    disabled={busy}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                  </Stepper>
                </div>
              ) : (
                // Un solo objetivo, grande: es el gesto que se repite cien veces.
                <button
                  type="button"
                  onClick={() => setCount(invitation, esperados)}
                  disabled={busy}
                  className="shrink-0 rounded-full bg-olive-600 px-5 py-3 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700 disabled:opacity-50"
                >
                  Llegó
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-cream-300 px-4 py-10 text-center font-sans text-sm text-ink-500">
          {onlyPending ? "Ya entraron todos los que buscabas." : "Nadie con ese nombre."}
        </p>
      )}
    </div>
  );
}

function Stepper({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full border border-cream-300 p-2.5 text-ink-700 transition-colors hover:border-olive-600 hover:text-olive-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
