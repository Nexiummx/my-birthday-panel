"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Check } from "lucide-react";
import { THEME_LIST } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Selector de tema: un grupo de radios presentado como muestras de color.
 *
 * Son radios de verdad, no botones con estado propio, para que el teclado y el
 * lector de pantalla lo recorran como el grupo único que es.
 */
export function ThemePicker({
  value,
  registration,
}: {
  value: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div role="radiogroup" aria-label="Tema de la invitación" className="grid gap-3 sm:grid-cols-2">
      {THEME_LIST.map((theme) => {
        const selected = value === theme.id;
        const [background, accent, paper] = theme.swatch;

        return (
          <label
            key={theme.id}
            className={cn(
              "relative flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors duration-200",
              selected
                ? "border-olive-600 bg-olive-600/8"
                : "border-cream-300 bg-cream-50 hover:border-gold-400"
            )}
          >
            <input
              type="radio"
              value={theme.id}
              className="sr-only"
              {...registration}
              defaultChecked={selected}
            />

            {/* Muestra: fondo, acento y papel, que es como se lee un tema. */}
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 overflow-hidden rounded-xl border border-cream-300"
            >
              <span className="w-1/2" style={{ background }} />
              <span className="flex w-1/2 flex-col">
                <span className="h-1/2" style={{ background: accent }} />
                <span className="h-1/2" style={{ background: paper }} />
              </span>
            </span>

            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-sans text-sm font-medium text-ink-900">
                {theme.label}
                {selected && <Check className="size-3.5 text-olive-600" aria-hidden="true" />}
              </span>
              <span className="mt-0.5 block font-sans text-xs leading-snug text-ink-500">
                {theme.tagline}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
