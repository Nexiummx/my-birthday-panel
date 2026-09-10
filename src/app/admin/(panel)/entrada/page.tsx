import type { Metadata } from "next";
import { NoEventState } from "@/components/admin/NoEventState";
import { DoorBoard } from "@/components/admin/DoorBoard";
import { listInvitations } from "@/lib/services/invitations";
import { toAdminInvitation } from "@/lib/admin-invitation";
import { requirePanelContext } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrada · Panel",
  robots: { index: false, follow: false },
};

/**
 * La lista de la puerta.
 *
 * Se usa el día del evento, de pie y con prisa, así que la columna es estrecha
 * a propósito: en un teléfono se lee de una pasada y en un portátil no obliga a
 * recorrer la pantalla entera con la vista.
 */
export default async function DoorPage() {
  const { session, event } = await requirePanelContext();
  if (!event) return <NoEventState />;

  const invitations = await listInvitations(session.sub, event.id);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          El día del evento
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">Entrada</h1>
        <p className="mt-2 font-sans text-sm text-ink-500">
          Marca quién va llegando. Cuenta personas, no invitaciones, y todo se puede deshacer.
        </p>
      </header>

      <DoorBoard invitations={invitations.map(toAdminInvitation)} />
    </div>
  );
}
