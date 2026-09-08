import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountManager } from "@/components/admin/AccountManager";
import { isSuperAdmin, listAccounts } from "@/lib/services/accounts";
import { toAdminAccount } from "@/lib/admin-account";
import { requirePanelContext } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes · Panel",
  robots: { index: false, follow: false },
};

export default async function ClientsPage() {
  const { session } = await requirePanelContext();

  // 404 y no una pantalla de "sin permiso": a quien no es superadmin no se le
  // confirma siquiera que esta sección exista.
  if (!(await isSuperAdmin(session.sub))) {
    notFound();
  }

  const accounts = await listAccounts();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Administración
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          Clientes
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Cada cliente entra con su propio correo y contraseña, y solo ve sus eventos. El cupo
          decide cuántos eventos sin archivar puede tener a la vez: súbelo cuando te pague.
        </p>
      </header>

      <AccountManager
        accounts={accounts.map(toAdminAccount)}
        currentAccountId={session.sub}
      />
    </div>
  );
}
