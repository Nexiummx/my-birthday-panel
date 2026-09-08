import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSession } from "@/lib/auth";
import { getActiveEvent } from "@/lib/services/events";
import { isSuperAdmin } from "@/lib/services/accounts";

/**
 * Contenedor del panel. `proxy.ts` ya bloquea /admin sin sesión; esta segunda
 * comprobación garantiza que ningún render del servidor ocurra sin sesión.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [event, superAdmin] = await Promise.all([
    getActiveEvent(session.sub),
    isSuperAdmin(session.sub),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100/40 lg:flex-row">
      <AdminSidebar
        email={session.email}
        eventName={event?.name ?? null}
        superAdmin={superAdmin}
      />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
