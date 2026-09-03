"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, LayoutDashboard, Leaf, LogOut, Mail, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/invitaciones", label: "Invitaciones", icon: Mail },
  { href: "/admin/confirmaciones", label: "Confirmaciones", icon: CalendarCheck },
] as const;

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* Barra superior en móvil */}
      <header className="flex items-center justify-between border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 font-serif text-lg text-forest-800">
          <Leaf className="size-4 text-olive-600" aria-hidden="true" />
          Bosque
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
        <div className="mb-8 hidden items-center gap-2 px-3 lg:flex">
          <Leaf className="size-5 text-olive-600" aria-hidden="true" />
          <span className="font-serif text-xl tracking-wide text-forest-800">
            Bosque Encantado
          </span>
        </div>

        {LINKS.map((link) => {
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
          <p className="truncate px-3 font-sans text-xs text-ink-500" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={signOut}
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
