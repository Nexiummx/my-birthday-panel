import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tarjeta de métrica del panel: dato grande, etiqueta discreta. */
export function StatsCard({
  label,
  value,
  hint,
  icon,
  accent = "olive",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "olive" | "gold" | "blush" | "ink";
}) {
  const accents = {
    olive: "text-olive-600 bg-olive-600/10",
    gold: "text-gold-600 bg-gold-500/12",
    blush: "text-blush-500 bg-blush-500/10",
    ink: "text-ink-700 bg-ink-500/10",
  } as const;

  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50 p-5 transition-shadow duration-300 hover:shadow-[0_10px_30px_-18px_rgba(42,44,34,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-500">{label}</p>
        {icon && (
          <span className={cn("rounded-full p-2", accents[accent])} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-serif text-4xl font-light text-forest-800">{value}</p>
      {hint && <p className="mt-1 font-sans text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
