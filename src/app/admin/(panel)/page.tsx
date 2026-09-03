import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Clock3, Mail, TrendingUp, UserX, Users } from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { getDashboardStats } from "@/lib/services/stats";
import { getDefaultEvent } from "@/lib/services/invitations";
import { formatLongDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resumen · Panel",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const [stats, event] = await Promise.all([getDashboardStats(), getDefaultEvent()]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">Resumen</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          {event ? event.name : "Sin evento configurado"}
        </h1>
        {event && (
          <p className="mt-2 font-sans text-sm text-ink-500">
            {formatLongDate(event.date)} · {event.time} · {event.location.split("\n")[0]}
          </p>
        )}
      </header>

      <section aria-label="Métricas principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total de invitaciones"
          value={stats.total}
          hint={`${stats.totalPasses} pases asignados`}
          icon={<Mail className="size-4" aria-hidden="true" />}
          accent="ink"
        />
        <StatsCard
          label="Confirmadas"
          value={stats.confirmed}
          hint={`${stats.confirmedGuests} personas asistirán`}
          icon={<CalendarCheck className="size-4" aria-hidden="true" />}
          accent="olive"
        />
        <StatsCard
          label="Pendientes"
          value={stats.pending}
          hint="Todavía no responden"
          icon={<Clock3 className="size-4" aria-hidden="true" />}
          accent="gold"
        />
        <StatsCard
          label="No asistirán"
          value={stats.declined}
          hint="Respondieron que no podrán"
          icon={<UserX className="size-4" aria-hidden="true" />}
          accent="blush"
        />
      </section>

      <section
        aria-label="Porcentaje de confirmación"
        className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"
      >
        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-500">
                Porcentaje de confirmación
              </p>
              <p className="mt-2 font-serif text-5xl font-light text-olive-600">
                {stats.confirmationRate}%
              </p>
            </div>
            <span className="rounded-full bg-olive-600/10 p-3 text-olive-600" aria-hidden="true">
              <TrendingUp className="size-5" />
            </span>
          </div>

          <div
            className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-cream-200"
            role="img"
            aria-label={`${stats.confirmationRate}% de las invitaciones están confirmadas`}
          >
            <div
              className="h-full rounded-full bg-olive-600 transition-[width] duration-700 ease-out"
              style={{ width: `${stats.confirmationRate}%` }}
            />
          </div>

          <p className="mt-3 font-sans text-xs text-ink-500">
            {stats.confirmed} de {stats.total} invitaciones confirmadas · {stats.responseRate}% ya
            respondió.
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-cream-200 bg-cream-50 p-6">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-500">
              Personas confirmadas
            </p>
            <p className="mt-2 flex items-baseline gap-2 font-serif text-5xl font-light text-forest-800">
              {stats.confirmedGuests}
              <span className="font-sans text-sm text-ink-500">de {stats.totalPasses}</span>
            </p>
          </div>
          <Link
            href="/admin/confirmaciones"
            className="mt-6 inline-flex items-center gap-2 font-sans text-sm text-olive-600 underline decoration-gold-400 underline-offset-4 transition-colors hover:text-olive-700"
          >
            <Users className="size-4" aria-hidden="true" />
            Ver confirmaciones
          </Link>
        </div>
      </section>
    </div>
  );
}
