"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Clapperboard,
  Images,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MailOpen,
  LogOut,
  Mail,
  Menu,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/invitaciones", label: "Invitaciones", icon: Mail },
  { href: "/admin/confirmaciones", label: "Confirmaciones", icon: CalendarCheck },
  { href: "/admin/fotos", label: "Fotos", icon: Images },
  { href: "/admin/recuerdo", label: "Recuerdo", icon: Clapperboard },
  { href: "/admin/evento", label: "Eventos", icon: CalendarDays },
  { href: "/admin/soporte", label: "Soporte", icon: LifeBuoy },
  { href: "/admin/cuenta", label: "Mi cuenta", icon: UserCog },
] as const;

/** Solo para el equipo: alta de clientes y cupos. */
const SUPER_LINKS = [
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/tickets", label: "Tickets", icon: Inbox },
] as const;

export function AdminSidebar({
  email,
  eventName,
  superAdmin,
}: {
  email: string;
  eventName: string | null;
  superAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const endSession = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* Barra superior en móvil */}
      <header className="flex items-center justify-between border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex min-w-0 items-center gap-2 font-serif text-lg text-forest-800">
          <MailOpen className="size-4 shrink-0 text-olive-600" aria-hidden="true" />
          <span className="truncate">{eventName ?? "Invitaciones"}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="rounded-full p-2 text-ink-700 transition-colors hover:bg-cream-200"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <nav
        className={cn(
          "flex-col gap-1 border-r border-cream-200 bg-cream-50/70 px-4 py-6 lg:flex lg:w-64 lg:shrink-0",
          open ? "flex" : "hidden"
        )}
        aria-label="Navegación del panel"
      >
        <div className="mb-8 hidden px-3 lg:block">
          <span className="flex items-center gap-2">
            <MailOpen className="size-5 text-olive-600" aria-hidden="true" />
            <span className="font-serif text-xl tracking-wide text-forest-800">Invitaciones</span>
          </span>
          {/* Todas las pantallas del panel operan sobre este evento, así que
              conviene tenerlo siempre a la vista. */}
          <span className="mt-1.5 block truncate font-sans text-xs text-ink-500" title={eventName ?? undefined}>
            {eventName ?? "Sin evento"}
          </span>
        </div>

        {[...LINKS, ...(superAdmin ? SUPER_LINKS : [])].map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm transition-colors duration-200",
                active
                  ? "bg-olive-600/10 font-medium text-olive-700"
                  : "text-ink-700 hover:bg-cream-200/70 hover:text-ink-900"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}

        <div className="mt-auto space-y-3 pt-8">
          <Link
            href="/admin/cuenta"
            onClick={() => setOpen(false)}
            className="block truncate px-3 font-sans text-xs text-ink-500 transition-colors hover:text-ink-900"
            title={email}
          >
            {email}
          </Link>
          <button
            type="button"
            onClick={endSession}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm text-ink-700 transition-colors hover:bg-blush-200/60 hover:text-blush-500 disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {signingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </nav>
    </>
  );
}
