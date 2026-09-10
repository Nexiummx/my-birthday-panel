import { BRAND, BRAND_INITIAL } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * El sello con la inicial y el nombre.
 *
 * Un sello de lacre y no un icono cualquiera: es el gesto que abre una
 * invitación de papel, y es literalmente lo que hace el invitado al entrar —la
 * experiencia arranca con una portada cerrada que hay que abrir—. El logo dice
 * de qué va el producto antes de leer una palabra.
 *
 * Se dibuja a partir de la inicial mientras no haya un logo de verdad. Ver
 * lib/brand.ts.
 */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Seal />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-xl tracking-wide text-forest-800">{BRAND.name}</span>
          <span className="mt-1 font-sans text-[9px] uppercase tracking-[0.3em] text-ink-500">
            {BRAND.kicker}
          </span>
        </span>
      )}
    </span>
  );
}

export function Seal({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      {/* Borde ondulado del lacre: doce lóbulos alrededor del círculo. */}
      <defs>
        <linearGradient id="sello" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-gold-400)" />
          <stop offset="100%" stopColor="var(--color-gold-600)" />
        </linearGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <circle
            key={index}
            cx={20 + Math.cos(angle) * 15}
            cy={20 + Math.sin(angle) * 15}
            r="4.6"
            fill="url(#sello)"
          />
        );
      })}
      <circle cx="20" cy="20" r="16" fill="url(#sello)" />
      <circle
        cx="20"
        cy="20"
        r="13"
        fill="none"
        stroke="var(--color-forest-900)"
        strokeOpacity="0.22"
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-serif"
        fontSize="15"
        fill="var(--color-forest-900)"
        fillOpacity="0.78"
      >
        {BRAND_INITIAL}
      </text>
    </svg>
  );
}
