import type { Metadata } from "next";
import { InvitationTable } from "@/components/admin/InvitationTable";
import { listInvitations } from "@/lib/services/invitations";
import { toAdminInvitation } from "@/lib/admin-invitation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitaciones · Panel",
  robots: { index: false, follow: false },
};

export default async function InvitationsPage() {
  const invitations = (await listInvitations()).map(toAdminInvitation);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">Gestión</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          Invitaciones
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Cada invitación tiene un enlace propio. Cópialo y compártelo directamente con la
          persona invitada.
        </p>
      </header>

      <InvitationTable invitations={invitations} />
    </div>
  );
}
