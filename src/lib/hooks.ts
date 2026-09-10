"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Suscribe un media query al ciclo de vida de React.
 *
 * `useSyncExternalStore` evita el patrón "setState dentro de un efecto": el
 * valor ya es correcto en el primer render del cliente y, en el servidor,
 * devuelve `false` para que el marcado inicial coincida.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** true si el sistema del usuario pide reducir el movimiento. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** true cuando el viewport supera el ancho indicado (por defecto, desktop). */
export function useIsDesktop(minWidth = 1024): boolean {
  return useMediaQuery(`(min-width: ${minWidth}px)`);
}

/** Bloquea el scroll del documento mientras `locked` sea true (modales). */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/**
 * Marca de tiempo que avanza sola, para relojes y cuentas atrás.
 *
 * Va con `useSyncExternalStore` y no con un efecto que llame a setState por dos
 * razones: en el servidor devuelve un valor fijo, así que el HTML inicial y la
 * hidratación coinciden —una cuenta atrás calculada en el servidor sería
 * distinta al milisegundo siguiente y React se quejaría—, y el compilador de
 * React no admite escribir estado dentro de un efecto.
 */
export function useNow(intervalMs = 1000): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    [intervalMs]
  );

  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    // En el servidor no hay "ahora" que valga: quien lo use debe tratar el 0
    // como "todavía no lo sé" y no pintar números inventados.
    () => 0
  );
}
