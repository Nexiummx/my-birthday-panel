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
