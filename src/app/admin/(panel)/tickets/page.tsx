import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketBoard } from "@/components/admin/TicketBoard";
import { listAllTickets } from "@/lib/services/tickets";
import { isSuperAdmin } from "@/lib/services/accounts";
import { toAdminTicket } from "@/lib/admin-ticket";
import { requirePanelContext } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tickets · Panel",
  robots: { index: false, follow: false },
};

export default async function TicketsPage() {
  const { session } = await requirePanelContext();

  // 404 y no "sin permiso", igual que /admin/clientes: a quien no es del equipo
  // no se le confirma siquiera que esta sección exista.
  if (!(await isSuperAdmin(session.sub))) {
    notFound();
  }

  const tickets = await listAllTickets();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Administración
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">Tickets</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Lo que los clientes piden y el panel no concede solo. Los abiertos salen primero;
          responder marca el ticket como contestado.
        </p>
      </header>

      <TicketBoard tickets={tickets.map(toAdminTicket)} team />
    </div>
  );
}
