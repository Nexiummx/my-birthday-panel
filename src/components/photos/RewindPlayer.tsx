"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Pause } from "lucide-react";
import { RewindCardView } from "@/components/photos/RewindCards";
import { Scene } from "@/components/invitation/scenes/Scene";
import type { RewindCard, RewindDeck } from "@/lib/services/rewind";
import { usePrefersReducedMotion, useScrollLock } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Reproductor del recuerdo, en formato stories.
 *
 * Una sola línea de tiempo de GSAP por pantalla gobierna cuatro cosas a la vez:
 * la transición de entrada, la cascada de los elementos, la deriva de las fotos
 * y la barra de progreso, y al terminar salta a la siguiente. Tenerlo todo en
 * la misma línea es lo que hace que pausar funcione de verdad —se pausa una
 * cosa, no cuatro que se van desincronizando— y que la barra siempre coincida
 * con lo que se está viendo.
 *
 * El fondo es la escena del propio tema, la misma que la invitación: el
 * recuerdo tiene que parecer la segunda mitad de la misma pieza, no otra app.
 *
 * Con "reducir movimiento" activo no hay animación ni avance automático: las
 * pantallas se pasan a mano y el contenido está visible desde el primer frame.
 */

/** Cuánto dura cada pantalla. Las que se leen necesitan más aire. */
function durationOf(card: RewindCard): number {
  switch (card.kind) {
    case "message":
      return 6.5;
    case "hero":
      return 6;
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

/** Las fotos que trae una pantalla, para poder adelantarlas. */
function photoUrlsOf(card: RewindCard): string[] {
  if (card.kind === "hero") return [card.photo.url];
  if (card.kind === "photos") return card.photos.map((photo) => photo.url);
  return [];
}

/** Umbral de arrastre para que cuente como pasar de pantalla. */
const SWIPE_PX = 48;

export function RewindPlayer({ deck }: { deck: RewindDeck }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  /** Hacia dónde va la transición. En un ref: no debe provocar un render. */
  const directionRef = useRef(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const total = deck.cards.length;

  useScrollLock(true);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), total - 1);
      setIndex((current) => {
        if (clamped !== current) directionRef.current = clamped > current ? 1 : -1;
        return clamped;
      });
    },
    [total]
  );

  // Se adelantan las fotos de las dos pantallas siguientes. Sin esto, la foto
  // grande aparece a medio cargar justo cuando le toca salir: es la diferencia
  // entre algo producido y algo que se está montando delante de ti.
  const upcoming = useMemo(
    () => deck.cards.slice(index + 1, index + 3).flatMap(photoUrlsOf),
    [deck.cards, index]
  );

  useEffect(() => {
    for (const url of upcoming) {
      const image = new Image();
      image.src = url;
    }
  }, [upcoming]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const card = deck.cards[index];
    const direction = directionRef.current;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        onComplete: () => {
          directionRef.current = 1;
          setIndex((current) => Math.min(current + 1, total - 1));
        },
      });

      // 1. La pantalla entera entra desde el lado por el que vino.
      timeline.fromTo(
        stageRef.current,
        { xPercent: direction * 6, opacity: 0, scale: 0.985 },
        { xPercent: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" },
        0
      );

      // 2. Y dentro, los elementos en cascada.
      timeline.fromTo(
        ".rw-in",
        { opacity: 0, y: 24, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
        },
        0.16
      );

      // 3. Ken Burns: la foto deriva durante toda la pantalla. Alterna el
      //    sentido por índice para que dos seguidas no se muevan igual.
      const kb = gsap.utils.toArray<HTMLElement>(".rw-kb");
      if (kb.length > 0) {
        timeline.fromTo(
          kb,
          { scale: 1.02, xPercent: 0, yPercent: 0 },
          {
            scale: 1.11,
            xPercent: (i: number) => (i % 2 === 0 ? -1.6 : 1.6),
            yPercent: (i: number) => (i % 3 === 0 ? 1.4 : -1.2),
            duration: durationOf(card),
            ease: "none",
          },
          0
        );
      }

      // 4. La barra de progreso, en la misma línea: por eso nunca miente.
      timeline.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: durationOf(card), ease: "none" },
        0
      );

      timelineRef.current = timeline;
    }, rootRef);

    return () => {
      timelineRef.current = null;
      context.revert();
    };
  }, [index, total, prefersReducedMotion, deck.cards]);

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

  /* ── Gestos ───────────────────────────────────────────────────────────
     Un mismo puntero resuelve las tres cosas que se esperan de unas stories:
     mantener pulsado pausa, arrastrar de lado cambia de pantalla, y tocar sin
     arrastrar avanza o retrocede según la mitad. Separarlo en botones haría
     imposible el arrastre. Los controles de abajo siguen siendo los destinos
     reales para teclado y lectores de pantalla.                            */

  const onPointerDown = (event: React.PointerEvent) => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    setPaused(true);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    setPaused(false);
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // Solo cuenta como arrastre si fue claramente horizontal: si no, un
    // desplazamiento vertical al leer una pantalla larga cambiaría de foto.
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      go(index + (dx < 0 ? 1 : -1));
      return;
    }

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const tappedLeftThird = event.clientX - bounds.left < bounds.width / 3;
      go(index + (tappedLeftThird ? -1 : 1));
    }
  };

  const atEnd = index === total - 1;

  return (
    <Scene theme={deck.theme}>
      <div ref={rootRef} className="relative flex h-dvh flex-col overflow-hidden text-cream-100">
        {/* Penumbra sobre la escena: el tipo grande del recuerdo compite con el
            elemento más detallado de cada tema si no se apaga el fondo. Se abre
            en el centro para que la escena siga viéndose. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(78% 58% at 50% 48%, color-mix(in srgb, var(--shade) 55%, transparent) 0%, var(--shade) 100%)",
          }}
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
                  // Sin animación la barra actual se pinta llena: si no, no
                  // habría forma de saber en qué pantalla se está.
                  position === index && prefersReducedMotion && "scale-x-100"
                )}
                style={
                  position === index && !prefersReducedMotion
                    ? { transform: "scaleX(0)" }
                    : undefined
                }
              />
            </span>
          ))}
        </nav>

        <div
          className="relative z-10 min-h-0 flex-1 touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            setPaused(false);
          }}
        >
          {/* key fuerza el remontaje: cada pantalla arranca limpia y GSAP anima
              elementos nuevos en vez de reciclar los de la anterior. */}
          <div ref={stageRef} key={index} className="h-full w-full overflow-y-auto">
            <RewindCardView card={deck.cards[index]} />
          </div>
        </div>

        {paused && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4">
            <Pause className="size-6" aria-hidden="true" />
          </span>
        )}

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
    </Scene>
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
