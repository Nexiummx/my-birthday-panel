import type { Metadata } from "next";
import { RSVPTable } from "@/components/admin/RSVPTable";
import { StatsCard } from "@/components/admin/StatsCard";
import { listInvitations } from "@/lib/services/invitations";
import { getDashboardStats } from "@/lib/services/stats";
import { toAdminInvitation } from "@/lib/admin-invitation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmaciones · Panel",
  robots: { index: false, follow: false },
};

export default async function ConfirmationsPage() {
  const [invitations, stats] = await Promise.all([listInvitations(), getDashboardStats()]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Seguimiento
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          Confirmaciones
        </h1>
      </header>

      <section aria-label="Estadísticas de respuesta" className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Ya respondieron"
          value={`${stats.responseRate}%`}
          hint={`${stats.confirmed + stats.declined} de ${stats.total} invitaciones`}
          accent="ink"
        />
        <StatsCard
          label="Confirmación"
          value={`${stats.confirmationRate}%`}
          hint={`${stats.confirmed} invitaciones confirmadas`}
          accent="olive"
        />
        <StatsCard
          label="Personas confirmadas"
          value={stats.confirmedGuests}
          hint={`de ${stats.totalPasses} pases asignados`}
          accent="gold"
        />
      </section>

      <RSVPTable invitations={invitations.map(toAdminInvitation)} />
    </div>
  );
}
