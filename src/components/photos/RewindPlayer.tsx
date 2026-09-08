"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Pause } from "lucide-react";
import { RewindCardView } from "@/components/photos/RewindCards";
import type { RewindCard, RewindDeck } from "@/lib/services/rewind";
import { attachParallax } from "@/lib/parallax";
import { usePrefersReducedMotion, useScrollLock } from "@/lib/hooks";
import { getTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Reproductor del recuerdo, en formato stories.
 *
 * Una sola línea de tiempo de GSAP por pantalla gobierna las tres cosas a la
 * vez: la entrada de los elementos, la barra de progreso y el salto a la
 * siguiente. Tenerlo todo en la misma línea es lo que hace que pausar funcione
 * de verdad —se pausa una cosa, no tres que se van desincronizando— y que la
 * barra siempre coincida con lo que se está viendo.
 *
 * Con "reducir movimiento" activo no hay animación ni avance automático: las
 * pantallas se pasan a mano y el contenido está visible desde el primer frame.
 */

/** Cuánto dura cada pantalla. Las que se leen necesitan más aire. */
function durationOf(card: RewindCard): number {
  switch (card.kind) {
    case "message":
      return 6.5;
    case "photos":
      return 6;
    case "names":
      return 5.5;
    case "intro":
    case "outro":
      return 5;
    default:
      return 4.5;
  }
}

export function RewindPlayer({ deck }: { deck: RewindDeck }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = getTheme(deck.theme);
  const total = deck.cards.length;

  useScrollLock(true);

  const go = useCallback(
    (next: number) => setIndex(Math.min(Math.max(next, 0), total - 1)),
    [total]
  );

  // El parallax escribe variables CSS: no provoca renders y las capas se mueven
  // en la GPU.
  useEffect(() => {
    if (prefersReducedMotion || !rootRef.current) return;
    return attachParallax(rootRef.current);
  }, [prefersReducedMotion]);

  // Una línea de tiempo por pantalla. Se reconstruye al cambiar de índice y se
  // revierte al salir, que devuelve los estilos que GSAP tocó.
  useEffect(() => {
    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        // El salto ocurre en un callback, no durante el render del efecto.
        onComplete: () => setIndex((current) => Math.min(current + 1, total - 1)),
      });

      timeline.fromTo(
        ".rw-in",
        { opacity: 0, y: 26, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.07,
        },
        0
      );

      // Los contadores suben desde cero: el número es el protagonista de esas
      // pantallas y verlo aparecer hecho no cuenta nada.
      const counter = stageRef.current?.querySelector<HTMLElement>("[data-count]");
      if (counter) {
        const target = Number(counter.dataset.count ?? "0");
        timeline.fromTo(
          { value: 0 },
          { value: 0 },
          {
            value: target,
            duration: 1.4,
            ease: "power2.out",
            snap: { value: 1 },
            onUpdate() {
              counter.textContent = String(Math.round(this.targets()[0].value));
            },
          },
          0.2
        );
      }

      // La barra de progreso es parte de la misma línea: por eso nunca se
      // desincroniza de lo que se ve.
      timeline.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: durationOf(deck.cards[index]), ease: "none" },
        0
      );

      timelineRef.current = timeline;
    }, rootRef);

    return () => {
      timelineRef.current = null;
      context.revert();
    };
  }, [index, total, prefersReducedMotion, deck.cards]);

  // Pausar al mantener pulsado, como en las stories.
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (paused) timeline.pause();
    else timeline.resume();
  }, [paused, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const atEnd = index === total - 1;

  return (
    <div
      ref={rootRef}
      data-theme={theme.attribute}
      className="fixed inset-0 flex flex-col overflow-hidden bg-forest-800 text-cream-100"
    >
      {/* Luz cálida del tema, detrás de todo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 45% at 50% 40%, var(--glow), transparent 70%)" }}
      />

      <nav
        aria-label="Progreso del recuerdo"
        className="relative z-20 flex gap-1 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        {deck.cards.map((card, position) => (
          <span
            key={position}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-cream-100/25"
          >
            <span
              ref={position === index ? barRef : undefined}
              className={cn(
                "block h-full origin-left bg-cream-100",
                position < index && "scale-x-100",
                position > index && "scale-x-0",
                // Sin animación la barra actual se pinta llena: si no, no habría
                // forma de saber en qué pantalla se está.
                position === index && prefersReducedMotion && "scale-x-100"
              )}
              style={position === index && !prefersReducedMotion ? { transform: "scaleX(0)" } : undefined}
            />
          </span>
        ))}
      </nav>

      <div ref={stageRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        {/* key fuerza el remontaje: cada pantalla arranca limpia y GSAP anima
            elementos nuevos en vez de reciclar los de la anterior. */}
        <RewindCardView key={index} card={deck.cards[index]} />
      </div>

      {/* Mitades invisibles para pasar con el pulgar, como en las stories. */}
      <div className="absolute inset-0 z-30 flex">
        <button
          type="button"
          aria-label="Pantalla anterior"
          className="h-full w-1/3 cursor-w-resize focus:outline-none"
          onClick={() => go(index - 1)}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        />
        <button
          type="button"
          aria-label="Pantalla siguiente"
          className="h-full w-2/3 cursor-e-resize focus:outline-none"
          onClick={() => go(index + 1)}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        />
      </div>

      {paused && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4">
          <Pause className="size-6" aria-hidden="true" />
        </span>
      )}

      {/* Controles visibles: las mitades invisibles no se descubren solas en
          escritorio, y con teclado hacen falta destinos reales. */}
      <div className="relative z-40 flex items-center justify-between px-4 pb-5 sm:px-6">
        <ControlButton onClick={() => go(index - 1)} disabled={index === 0} label="Anterior">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </ControlButton>

        <p className="font-sans text-[11px] uppercase tracking-[0.24em] opacity-75">
          {index + 1} / {total}
        </p>

        <ControlButton onClick={() => go(index + 1)} disabled={atEnd} label="Siguiente">
          <ChevronRight className="size-5" aria-hidden="true" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full border border-cream-100/35 bg-black/25 p-2.5 backdrop-blur-sm transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-20"
    >
      {children}
    </button>
  );
}
