import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

/**
 * Estado de una cuenta que todavía no creó su primer evento. Sin evento no hay
 * a quién invitar ni qué medir, así que todas las pantallas del panel empujan
 * al mismo sitio.
 */
export function NoEventState() {
  return (
    <EmptyState
      icon={<CalendarPlus className="size-8" aria-hidden="true" />}
      title="Todavía no tienes un evento"
      description="Crea tu evento para elegir el tema de la invitación y empezar a invitar."
      action={
        <Link
          href="/admin/evento"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-olive-600 px-5 py-2.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
        >
          Crear evento
        </Link>
      }
    />
  );
}
