import { round } from "./geometry";

/**
 * Piezas sueltas de los telones de Vaqueros y Disco.
 *
 * Siguen la misma idea que `botanicals.tsx` en el tema del bosque: siluetas
 * pequeñas y reutilizables con las que se compone el filo del telón. Todas
 * dibujan centradas en el origen para poder colocarlas con un translate.
 */

/** Generador determinista. Con Math.random el SSR y el cliente no coincidirían. */
export function seeded(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/* ── Vaqueros ─────────────────────────────────────────────────── */

export function Saguaro({ height = 150, arms = "both" }: { height?: number; arms?: "both" | "left" | "right" | "none" }) {
  const width = height * 0.13;
  const left = arms === "both" || arms === "left";
  const right = arms === "both" || arms === "right";

  return (
    <g>
      <rect x={-width / 2} y={-height} width={width} height={height} rx={width / 2} />
      {left && (
        <>
          <rect x={-height * 0.3} y={-height * 0.62} width={width * 0.78} height={height * 0.34} rx={width * 0.39} />
          <rect x={-height * 0.3} y={-height * 0.62} width={height * 0.26} height={width * 0.78} rx={width * 0.39} />
        </>
      )}
      {right && (
        <>
          <rect x={height * 0.22} y={-height * 0.74} width={width * 0.78} height={height * 0.42} rx={width * 0.39} />
          <rect x={height * 0.05} y={-height * 0.74} width={height * 0.24} height={width * 0.78} rx={width * 0.39} />
        </>
      )}
    </g>
  );
}

export function Agave({ size = 60 }: { size?: number }) {
  return (
    <g>
      {[-72, -48, -24, 0, 24, 48, 72].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          d={`M${-size * 0.09} 0 L${-size * 0.045} ${-size * 0.85} L0 ${-size} L${size * 0.045} ${-size * 0.85} L${size * 0.09} 0 Z`}
        />
      ))}
    </g>
  );
}

/** Rueda de carreta: llanta, cubo y radios. */
export function WagonWheel({ radius = 46 }: { radius?: number }) {
  return (
    <g>
      <circle r={radius} fill="none" stroke="currentColor" strokeWidth={radius * 0.13} />
      <circle r={radius * 0.18} />
      {Array.from({ length: 10 }, (_, index) => (
        <line
          key={index}
          x1="0"
          y1="0"
          x2={round(Math.cos((index * Math.PI) / 5) * radius)}
          y2={round(Math.sin((index * Math.PI) / 5) * radius)}
          stroke="currentColor"
          strokeWidth={radius * 0.07}
        />
      ))}
    </g>
  );
}

/** Barril de duelas con sus aros. */
export function Barrel({ height = 74 }: { height?: number }) {
  const width = height * 0.68;
  return (
    <g>
      <path
        d={`M${-width / 2} 0
            C ${-width * 0.62} ${-height * 0.3} ${-width * 0.62} ${-height * 0.7} ${-width / 2} ${-height}
            L ${width / 2} ${-height}
            C ${width * 0.62} ${-height * 0.7} ${width * 0.62} ${-height * 0.3} ${width / 2} 0 Z`}
      />
      <g stroke="currentColor" strokeWidth={height * 0.05} opacity="0.45">
        <line x1={-width * 0.6} y1={-height * 0.26} x2={width * 0.6} y2={-height * 0.26} />
        <line x1={-width * 0.6} y1={-height * 0.72} x2={width * 0.6} y2={-height * 0.72} />
      </g>
    </g>
  );
}

/** Herradura: arco abierto por abajo, con sus clavos. */
export function Horseshoe({ size = 34 }: { size?: number }) {
  return (
    <g>
      <path
        d={`M${-size * 0.62} ${size * 0.72}
            A ${size} ${size} 0 1 1 ${size * 0.62} ${size * 0.72}
            L ${size * 0.3} ${size * 0.72}
            A ${size * 0.62} ${size * 0.62} 0 1 0 ${-size * 0.3} ${size * 0.72} Z`}
      />
    </g>
  );
}

/**
 * Farol colgante. El cristal lleva su propia luz: es la única fuente cálida del
 * telón y sin ella la pieza se leía como un rectángulo beige.
 */
export function Lantern({
  height = 66,
  hang = 90,
  frame = "#6f6350",
  flame = "#f0d9a0",
}: {
  height?: number;
  hang?: number;
  frame?: string;
  flame?: string;
}) {
  const width = height * 0.62;
  return (
    <g>
      <line x1="0" y1={-hang} x2="0" y2={-height} stroke={frame} strokeWidth="2.5" />
      {/* Resplandor alrededor del cristal. */}
      <circle cy={-height * 0.48} r={height * 0.62} fill={flame} opacity="0.12" />
      <rect x={-width / 2} y={-height} width={width} height={height * 0.16} rx="3" fill={frame} />
      <path
        d={`M${-width * 0.42} ${-height * 0.84} L${width * 0.42} ${-height * 0.84} L${width * 0.34} ${-height * 0.12} L${-width * 0.34} ${-height * 0.12} Z`}
        fill={flame}
        opacity="0.75"
      />
      {/* Llama */}
      <ellipse cx="0" cy={-height * 0.46} rx={width * 0.12} ry={height * 0.18} fill="#fff6e0" opacity="0.9" />
      <rect x={-width * 0.46} y={-height * 0.12} width={width * 0.92} height={height * 0.14} rx="3" fill={frame} />
    </g>
  );
}

/* ── Disco ────────────────────────────────────────────────────── */

/**
 * Bola de espejos pequeña. Aquí no hace falta el facetado completo de la
 * escena: a este tamaño basta una retícula de cuadrados para que se lea.
 */
export function MiniBall({ radius = 34, hang = 0 }: { radius?: number; hang?: number }) {
  const cells: Array<{ x: number; y: number; o: number }> = [];
  const step = radius / 3.2;

  for (let gx = -3; gx <= 3; gx += 1) {
    for (let gy = -3; gy <= 3; gy += 1) {
      const x = gx * step;
      const y = gy * step;
      if (round(Math.hypot(x, y)) > round(radius - step * 0.5)) continue;
      cells.push({ x, y, o: 0.25 + ((gx * 5 + gy * 3 + 12) % 7) / 9 });
    }
  }

  return (
    <g>
      {hang > 0 && <line x1="0" y1={-hang} x2="0" y2={-radius} stroke="currentColor" strokeWidth="2" opacity="0.5" />}
      <circle r={radius} opacity="0.55" />
      {cells.map((cell, index) => (
        <rect
          key={index}
          x={cell.x - step * 0.42}
          y={cell.y - step * 0.42}
          width={step * 0.84}
          height={step * 0.84}
          opacity={cell.o}
        />
      ))}
    </g>
  );
}

/**
 * Disco de vinilo. Cuerpo y surcos van en colores explícitos, no en opacidades
 * del mismo tono: heredando un único color el disco salía liso, sin surcos.
 */
export function Vinyl({
  radius = 40,
  body = "#141024",
  groove = "#c9a227",
  label = "#c9a227",
}: {
  radius?: number;
  body?: string;
  groove?: string;
  label?: string;
}) {
  return (
    <g>
      <circle r={radius} fill={body} />
      <g fill="none" stroke={groove} strokeWidth={Math.max(0.8, radius * 0.028)} opacity="0.55">
        {[0.9, 0.79, 0.68, 0.57, 0.46].map((factor) => (
          <circle key={factor} r={radius * factor} />
        ))}
      </g>
      <circle r={radius * 0.3} fill={label} />
      <circle r={radius * 0.055} fill={body} />
      {/* Reflejo: una franja clara cruzando el disco. */}
      <path
        d={`M${-radius} ${-radius * 0.32} L${radius} ${-radius * 0.62} L${radius} ${-radius * 0.44} L${-radius} ${-radius * 0.14} Z`}
        fill="#ffffff"
        opacity="0.09"
      />
    </g>
  );
}

/** Copa de cóctel. */
export function Cocktail({ height = 58 }: { height?: number }) {
  const width = height * 0.62;
  return (
    <g>
      <path d={`M${-width / 2} ${-height} L${width / 2} ${-height} L0 ${-height * 0.44} Z`} />
      <rect x="-1.6" y={-height * 0.46} width="3.2" height={height * 0.4} />
      <rect x={-width * 0.3} y={-height * 0.08} width={width * 0.6} height="4" rx="2" />
      <circle cx={width * 0.28} cy={-height * 0.94} r={height * 0.09} opacity="0.8" />
    </g>
  );
}

/** Bombilla de guirnalda. */
export function Bulb({ size = 16 }: { size?: number }) {
  return (
    <g>
      <circle cy={size * 0.3} r={size * 0.62} />
      <rect x={-size * 0.26} y={-size * 0.5} width={size * 0.52} height={size * 0.42} rx="2" opacity="0.7" />
    </g>
  );
}

/** Destello de cuatro puntas con las diagonales cóncavas. */
export function Sparkle({ size = 22 }: { size?: number }) {
  const s = size;
  return (
    <path
      d={`M0 ${-s} C ${s * 0.12} ${-s * 0.34} ${s * 0.34} ${-s * 0.12} ${s} 0
          C ${s * 0.34} ${s * 0.12} ${s * 0.12} ${s * 0.34} 0 ${s}
          C ${-s * 0.12} ${s * 0.34} ${-s * 0.34} ${s * 0.12} ${-s} 0
          C ${-s * 0.34} ${-s * 0.12} ${-s * 0.12} ${-s * 0.34} 0 ${-s} Z`}
    />
  );
}

/**
 * Altavoz de columna. Los conos van más oscuros que la caja y con aro claro:
 * con solo una opacidad del mismo color la silueta se leía como un cajón.
 */
export function Speaker({
  height = 130,
  body = "#241d38",
  cone = "#0a0714",
  rim = "#6b6288",
}: {
  height?: number;
  body?: string;
  cone?: string;
  rim?: string;
}) {
  const width = height * 0.46;
  return (
    <g>
      <rect x={-width / 2} y={-height} width={width} height={height} rx="5" fill={body} />
      <rect
        x={-width / 2}
        y={-height}
        width={width}
        height={height}
        rx="5"
        fill="none"
        stroke={rim}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <g>
        <circle cy={-height * 0.72} r={width * 0.31} fill={cone} stroke={rim} strokeWidth="1.5" />
        <circle cy={-height * 0.72} r={width * 0.11} fill={rim} opacity="0.6" />
        <circle cy={-height * 0.34} r={width * 0.2} fill={cone} stroke={rim} strokeWidth="1.2" />
      </g>
    </g>
  );
}
