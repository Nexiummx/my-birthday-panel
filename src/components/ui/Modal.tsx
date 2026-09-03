"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Modal accesible sin dependencias: cierra con Escape, bloquea el scroll,
 * mantiene el foco dentro del diálogo y lo devuelve al cerrarse.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-forest-950/70 backdrop-blur-sm animate-rise-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        className={cn(
          "paper-texture paper-grain relative z-10 max-h-[92dvh] w-full overflow-y-auto",
          "rounded-t-3xl border border-cream-300 px-6 pb-8 pt-7 shadow-2xl shadow-forest-950/40",
          "animate-rise-in sm:max-w-md sm:rounded-3xl",
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-2 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <h2
          id="modal-title"
          className="pr-8 font-serif text-2xl font-light tracking-wide text-ink-900"
        >
          {title}
        </h2>
        {description && (
          <p id="modal-description" className="mt-1.5 font-sans text-sm text-ink-500">
            {description}
          </p>
        )}

        <div className="relative mt-6">{children}</div>
      </div>
    </div>
  );
}
