import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { NoEventState } from "@/components/admin/NoEventState";
import { getQuota } from "@/lib/services/events";
import { SendBoard } from "@/components/admin/SendBoard";
import { listInvitations } from "@/lib/services/invitations";
import { toAdminInvitation } from "@/lib/admin-invitation";
import { requirePanelContext } from "@/lib/panel";
import { formatInvitationDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Envío · Panel",
  robots: { index: false, follow: false },
};

export default async function SendPage() {
  const { session, event } = await requirePanelContext();
  if (!event) return <NoEventState quotaLimit={(await getQuota(session.sub)).limit} />;

  const invitations = await listInvitations(session.sub, event.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
            Invitados
          </p>
          <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
            Envío y seguimiento
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
            Manda cada invitación por WhatsApp con el mensaje ya escrito, y mira quién la abrió.
            El texto se cambia en Eventos.
          </p>
        </div>

        {/* Descarga directa: la lista acaba en manos del salón, y esa gente
            trabaja en Excel. */}
        <Link
          href="/api/invitations/export"
          className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 font-sans text-xs text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-900"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Descargar lista
        </Link>
      </header>

      <SendBoard
        invitations={invitations.map(toAdminInvitation)}
        eventName={event.name}
        eventDateLabel={formatInvitationDate(event.date)}
        template={event.inviteMessage}
      />
    </div>
  );
}
