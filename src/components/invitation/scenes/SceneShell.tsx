"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { attachParallax } from "@/lib/parallax";

/**
 * Armazón común de todas las escenas.
 *
 * Resuelve lo que no cambia entre temas: el contenedor a pantalla completa, el
 * fondo, el parallax de puntero y la viñeta. Cada tema solo aporta sus capas,
 * que se posicionan con <SceneLayer> indicando cuánto se desplazan.
 */
export function SceneShell({
  background,
  vignette = "radial-gradient(70% 55% at 50% 48%, transparent 42%, rgba(8, 10, 14, 0.45) 100%)",
  children,
  content,
}: {
  /** CSS de background del cielo/fondo del tema. */
  background: string;
  /** Viñeta que enfoca el centro. Los temas claros la quieren más suave. */
  vignette?: string;
  /** Capas decorativas del tema. */
  children: ReactNode;
  /** La invitación en sí, por encima de todo. */
  content?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = rootRef.current;
    if (!element || prefersReducedMotion) return;
    // Solo con puntero fino: en táctil el parallax no aporta y gasta batería.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    return attachParallax(element);
  }, [prefersReducedMotion]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-dvh w-full overflow-hidden bg-forest-950"
      style={{ ["--parallax-x" as string]: 0, ["--parallax-y" as string]: 0 }}
    >
      <div aria-hidden="true" className="absolute inset-0" style={{ background }} />

      {children}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: vignette }}
      />

      <div className="relative z-10 min-h-dvh w-full">{content}</div>
    </div>
  );
}

/**
 * Una capa de profundidad. `depth` es cuántos píxeles se mueve con el puntero:
 * negativo para lo que está delante de la tarjeta, positivo para el fondo.
 */
export function SceneLayer({
  className,
  depthX = 0,
  depthY = 0,
  style,
  children,
}: {
  className?: string;
  depthX?: number;
  depthY?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        ...style,
        transform: `translate3d(calc(var(--parallax-x) * ${depthX}px), calc(var(--parallax-y) * ${depthY}px), 0)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Partículas en suspensión resueltas en CSS (polvo, destellos, brillos).
 * Las posiciones se derivan del índice, no de Math.random: con SSR cualquier
 * valor aleatorio produciría un desajuste de hidratación.
 */
export function SceneParticles({
  count,
  className,
  animationClass,
  duration,
}: {
  count: number;
  /** Clases de la partícula: tamaño, color y forma. */
  className: string;
  /** Clase de animación (definida en globals.css). */
  animationClass: string;
  /** Duración base en segundos; cada partícula la varía un poco. */
  duration: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, index) => {
        const left = (index * 37) % 100;
        const top = (index * 53) % 100;
        const delay = -((index * 1.7) % duration);
        const scale = 0.6 + ((index * 13) % 70) / 100;

        return (
          <span
            key={index}
            className={`${className} ${animationClass}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration + (index % 5)}s`,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </div>
  );
}
