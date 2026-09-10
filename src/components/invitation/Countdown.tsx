"use client";

import { useNow } from "@/lib/hooks";

/**
 * Cuenta atrás hasta el evento.
 *
 * Es lo que hace que una invitación abierta dos veces no sea la misma las dos:
 * la segunda dice algo distinto. Y es, con diferencia, lo que más se pide en
 * una invitación digital.
 *
 * En el servidor no se pinta ningún número. `useNow` devuelve 0 allí, y aquí
 * eso significa "todavía no lo sé": inventar una cuenta atrás en el servidor
 * daría un valor caducado en cuanto llegara al navegador. Se reserva el hueco
 * para que el diseño no salte al hidratar.
 */
export function Countdown({ dateIso }: { dateIso: string }) {
  const now = useNow(60_000);
  const target = new Date(dateIso).getTime();

  if (!Number.isFinite(target)) return null;

  // Todavía en el servidor: se deja el sitio reservado y sin números.
  if (now === 0) {
    return <div aria-hidden="true" className="h-[3.25rem]" />;
  }

  const remaining = target - now;

  if (remaining <= 0) {
    return (
      <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-gold-600">
        Hoy es el día
      </p>
    );
  }

  const minutes = Math.floor(remaining / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);

  return (
    <div className="flex items-end justify-center gap-4">
      <Unit value={days} label={days === 1 ? "día" : "días"} />
      <Unit value={hours} label={hours === 1 ? "hora" : "horas"} />
      <Unit value={minutes % 60} label="min" />
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <p className="flex flex-col items-center">
      <span className="font-serif text-2xl leading-none text-forest-950 tabular-nums">
        {value}
      </span>
      <span className="mt-1 font-sans text-[9px] uppercase tracking-[0.22em] text-ink-500">
        {label}
      </span>
    </p>
  );
}
