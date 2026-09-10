import Link from "next/link";
import { Camera, Check, Clapperboard, DoorOpen, Lock } from "lucide-react";
import type { OnboardingProgress } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * La guía de los primeros pasos.
 *
 * No es una tarjeta más en el panel: mientras la cuenta no esté en marcha,
 * **esto es el panel**. Antes, un anfitrión recién registrado veía cuatro
 * contadores a cero, que no le dicen nada que no supiera, y un menú de diez
 * pantallas que todavía no puede usar.
 *
 * Desaparece sola cuando sale la primera invitación. No hay botón de descartar
 * a propósito: si se puede descartar hay que recordarlo, y recordarlo obliga a
 * guardar una preferencia que se desincroniza. Cuando ya no hace falta, no
 * está.
 */
export function OnboardingGuide({ progress }: { progress: OnboardingProgress }) {
  const { tasks, done, total } = progress;

  return (
    <section aria-label="Primeros pasos" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
            Primeros pasos
          </p>
          <h2 className="mt-2 font-serif text-2xl font-light text-forest-800">
            Vamos a dejar tu fiesta lista
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full bg-cream-200"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${done} de ${total} pasos`}
          >
            <div
              className="h-full rounded-full bg-olive-600 transition-[width] duration-500"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          <p className="font-sans text-xs tabular-nums text-ink-500">
            {done} de {total}
          </p>
        </div>
      </header>

      <ol className="space-y-3">
        {tasks.map((task, index) => (
          <li
            key={task.step}
            className={cn(
              "flex gap-4 rounded-2xl border p-5 transition-colors",
              task.current
                ? "border-olive-600 bg-cream-50 ring-1 ring-olive-600/20"
                : "border-cream-200 bg-cream-50/60"
            )}
          >
            {/* El número es la posición en un orden que importa: sin plan no
                hay evento, sin evento no hay a quién invitar. */}
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold",
                task.done
                  ? "bg-olive-600 text-cream-50"
                  : task.current
                    ? "bg-olive-600/12 text-olive-700"
                    : "bg-cream-200 text-ink-500"
              )}
              aria-hidden="true"
            >
              {task.done ? <Check className="size-4" /> : index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "font-serif text-lg",
                  task.done ? "text-ink-500 line-through decoration-ink-500/40" : "text-ink-900"
                )}
              >
                {task.title}
              </h3>
              {!task.done && (
                <p className="mt-1 font-sans text-sm leading-snug text-ink-500">{task.why}</p>
              )}

              {task.current && (
                <Link
                  href={task.href}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-olive-600 px-4 py-2 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
                >
                  {task.cta}
                </Link>
              )}

              {/* Bloqueado: se dice por qué en vez de ofrecer un botón que
                  lleva a una pantalla que va a decir que no. */}
              {task.blocked && (
                <p className="mt-2 inline-flex items-center gap-1.5 font-sans text-xs text-ink-500">
                  <Lock className="size-3" aria-hidden="true" />
                  Cuando termines el paso anterior
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <WhatComesNext />
    </section>
  );
}

/**
 * Lo que hay después de mandar las invitaciones.
 *
 * No son tareas —no hay nada que hacer todavía— pero sí es la mitad del
 * producto, y quien no sabe que existe no la usa. Va como texto, no como
 * casillas, para no mezclar lo que toca hoy con lo que toca el día de la
 * fiesta.
 */
function WhatComesNext() {
  const items = [
    {
      icon: DoorOpen,
      title: "El día de la fiesta",
      text: "Pasas lista desde el teléfono, en la puerta, marcando quién llegó de verdad.",
    },
    {
      icon: Camera,
      title: "Las fotos de tus invitados",
      text: "Un QR en las mesas y todos suben lo que tomaron. Tú decides qué se ve.",
    },
    {
      icon: Clapperboard,
      title: "El recuerdo",
      text: "Con esas fotos se arma un video para compartir en redes, con su música.",
    },
  ];

  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-100/50 p-5">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-500">
        Y cuando ya estén enviadas
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-olive-600" aria-hidden="true" />
            <div>
              <p className="font-sans text-sm font-medium text-ink-900">{title}</p>
              <p className="mt-0.5 font-sans text-xs leading-snug text-ink-500">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
