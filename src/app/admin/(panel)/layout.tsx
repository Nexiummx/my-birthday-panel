import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSession } from "@/lib/auth";

/**
 * Contenedor del panel. `proxy.ts` ya bloquea /admin sin sesión; esta segunda
 * comprobación garantiza que ningún render del servidor ocurra sin sesión.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100/40 lg:flex-row">
      <AdminSidebar email={session.email} />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
