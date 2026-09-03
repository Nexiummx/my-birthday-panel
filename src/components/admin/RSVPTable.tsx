"use client";

import { useMemo, useState } from "react";
import { MessageSquareDashed } from "lucide-react";
import { StatusBadge, STATUS_LABELS } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import type { AdminInvitation } from "@/lib/admin-invitation";
import type { InvitationStatusValue } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Filter = "ALL" | InvitationStatusValue;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "CONFIRMED", label: STATUS_LABELS.CONFIRMED },
  { value: "PENDING", label: STATUS_LABELS.PENDING },
  { value: "DECLINED", label: STATUS_LABELS.DECLINED },
];

export function RSVPTable({ invitations }: { invitations: AdminInvitation[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts = useMemo(
    () => ({
      ALL: invitations.length,
      CONFIRMED: invitations.filter((row) => row.status === "CONFIRMED").length,
      PENDING: invitations.filter((row) => row.status === "PENDING").length,
      DECLINED: invitations.filter((row) => row.status === "DECLINED").length,
    }),
    [invitations]
  );

  const rows = useMemo(
    () => (filter === "ALL" ? invitations : invitations.filter((row) => row.status === filter)),
    [invitations, filter]
  );

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filtrar confirmaciones"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              "rounded-full border px-4 py-2 font-sans text-xs transition-colors duration-200",
              filter === option.value
                ? "border-olive-600 bg-olive-600/10 font-medium text-olive-700"
                : "border-cream-300 bg-cream-50 text-ink-500 hover:border-gold-400 hover:text-ink-900"
            )}
          >
            {option.label}
            <span className="ml-2 text-ink-500/80">{counts[option.value]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquareDashed className="size-8" aria-hidden="true" />}
          title="Sin resultados"
          description="No hay invitaciones con este estado todavía."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-cream-50">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-100/60">
                {["Invitado", "Pases", "Estado", "Fecha de respuesta", "Comentario"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-cream-200/70 transition-colors last:border-0 hover:bg-cream-100/50"
                >
                  <td className="px-4 py-3 font-serif text-base text-ink-900">{row.guestName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-700">
                    {row.rsvpGuestCount ?? "—"}
                    <span className="text-ink-500"> / {row.guestCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-500">
                    {row.respondedAtLabel}
                  </td>
                  <td className="max-w-xs px-4 py-3 font-sans text-sm text-ink-700">
                    {row.comment ? (
                      <span className="line-clamp-2 italic">“{row.comment}”</span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
