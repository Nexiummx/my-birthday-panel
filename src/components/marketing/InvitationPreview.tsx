"use client";

import { useEffect, useState } from "react";
import { THEME_LIST, getTheme } from "@/lib/themes";
import { themeFontVariables } from "@/lib/theme-fonts";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * La invitación, en un teléfono, cambiando de tema sola.
 *
 * Es el argumento de venta entero en un solo objeto. "Cuatro temas" dicho con
 * palabras no significa nada; verlo cambiar —la paleta, la escena y **la
 * tipografía**— se entiende en dos segundos.
 *
 * Las letras son las de verdad: se pone `data-theme` y las variables de fuente
 * reales, las mismas que usa la invitación. No es una imitación pintada a mano,
 * es el sistema de temas funcionando en la portada.
 */

const CADA = 4200;

export function InvitationPreview() {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % THEME_LIST.length), CADA);
    return () => clearInterval(timer);
  }, [reduced]);

  const theme = THEME_LIST[index];
  const { reel, copy } = getTheme(theme.id);

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        data-theme={theme.attribute}
        className={cn(
          themeFontVariables,
          "relative aspect-[9/17] w-[248px] overflow-hidden rounded-[2.2rem] border-[6px] border-forest-900/85 shadow-[0_40px_80px_-40px_rgba(20,30,15,0.65)] sm:w-[272px]"
        )}
        style={{ background: `linear-gradient(165deg, ${reel.top} 0%, ${reel.bottom} 100%)` }}
      >
        {/* Un resplandor que sale del color de acento de cada tema. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `radial-gradient(60% 40% at 50% 32%, ${reel.accent}33 0%, transparent 70%)`,
          }}
        />

        <div
          key={theme.id}
          className="relative flex h-full flex-col items-center justify-center px-7 text-center [animation:aparecer_.7s_ease-out]"
          style={{ color: reel.paper }}
        >
          <p className="font-sans text-[9px] uppercase tracking-[0.32em] opacity-70">
            {copy.eyebrow}
          </p>

          <p className="mt-7 font-display-script text-[2.6rem] leading-[0.95]">Sofía</p>
          <p
            className="font-display-script text-[3.4rem] leading-none"
            style={{ color: reel.accent }}
          >
            XV
          </p>

          <span
            aria-hidden="true"
            className="mt-6 block h-px w-12"
            style={{ background: reel.accent, opacity: 0.6 }}
          />

          <p className="mt-6 max-w-[16ch] font-serif text-[13px] leading-snug opacity-90">
            {copy.headline}
          </p>

          <span
            className="mt-8 rounded-full border px-5 py-2 font-sans text-[10px] uppercase tracking-[0.18em]"
            style={{ borderColor: `${reel.accent}88`, color: reel.accent }}
          >
            {copy.cta}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2" role="tablist" aria-label="Temas">
        {THEME_LIST.map((option, position) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={position === index}
            aria-label={option.label}
            onClick={() => setIndex(position)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              position === index ? "w-7 bg-olive-600" : "w-2 bg-cream-300 hover:bg-gold-400"
            )}
          />
        ))}
      </div>

      <p className="font-sans text-xs text-ink-500">
        <span className="text-ink-700">{theme.label}</span> · {theme.tagline}
      </p>
    </div>
  );
}
