"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";

/**
 * Vaqueros · blanco y negro.
 *
 * Desierto al atardecer resuelto como fotografía monocroma: un sol muy blanco
 * al fondo y todo lo demás en silueta, de lo más lejano (mesetas) a lo más
 * cercano (cerca de madera). El polvo en suspensión da la profundidad que en
 * color darían los tonos.
 */
export function VaquerosScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      background="radial-gradient(120% 85% at 50% 34%, #ded4c0 0%, #9d9285 26%, #4a443a 58%, #1b1814 82%, #0c0b09 100%)"
      vignette="radial-gradient(72% 58% at 50% 46%, transparent 38%, rgba(12, 11, 9, 0.72) 100%)"
      content={children}
    >
      {/* Sol bajo: el único punto realmente claro de la escena. */}
      <SceneLayer className="absolute inset-x-0 top-[16vh] flex justify-center" depthX={6} depthY={4}>
        <div
          className="size-[42vh] rounded-full opacity-90 blur-[2px]"
          style={{
            background:
              "radial-gradient(circle, #f4efe2 0%, #ded4c0 42%, rgba(222, 212, 192, 0.35) 62%, transparent 72%)",
          }}
        />
      </SceneLayer>

      {/* Mesetas lejanas */}
      <SceneLayer className="absolute inset-x-0 top-[38vh] h-[26vh] opacity-70 blur-[1px]" depthX={10} depthY={5}>
        <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <path
            d="M0 260 L0 150 L120 150 L150 96 L330 96 L360 150 L520 150 L520 260 Z"
            fill="var(--color-forest-800)"
          />
          <path
            d="M760 260 L760 122 L900 122 L928 74 L1120 74 L1148 122 L1300 122 L1300 260 Z"
            fill="var(--color-forest-800)"
          />
        </svg>
      </SceneLayer>

      {/* Cordillera media */}
      <SceneLayer className="absolute inset-x-0 bottom-[26vh] h-[22vh]" depthX={-14} depthY={-6}>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <path
            d="M0 220 L0 160 C 160 120 280 176 420 140 C 560 104 700 168 860 136 C 1020 104 1180 170 1440 128 L1440 220 Z"
            fill="var(--color-forest-900)"
          />
        </svg>
      </SceneLayer>

      {/* Sotobosque del desierto: suelo, cactus y cerca */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[32vh]" depthX={-24} depthY={8}>
        <svg viewBox="0 0 1440 340" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <path
            d="M0 340 L0 214 C 220 186 420 236 640 210 C 860 184 1080 232 1440 198 L1440 340 Z"
            fill="var(--color-forest-950)"
          />

          <g fill="var(--color-forest-950)">
            <Cactus x={150} y={214} scale={1} />
            <Cactus x={1280} y={200} scale={1.25} />
            <Cactus x={1030} y={224} scale={0.7} />
          </g>

          {/* Cerca de madera: marca el primer plano sin tapar la tarjeta. */}
          <g stroke="var(--color-forest-950)" strokeWidth="7" strokeLinecap="round">
            {[40, 118, 196, 274].map((x) => (
              <line key={x} x1={x} y1={250} x2={x - 4} y2={332} />
            ))}
            <line x1="30" y1="272" x2="286" y2="262" strokeWidth="5" />
            <line x1="32" y1="304" x2="284" y2="294" strokeWidth="5" />
          </g>
        </svg>
      </SceneLayer>

      {/* Polvo: deriva lateral lenta, apenas visible. */}
      <SceneParticles
        count={22}
        duration={14}
        animationClass="animate-dust"
        className="size-[3px] rounded-full bg-cream-200/50"
      />
    </SceneShell>
  );
}

/** Saguaro de dos brazos. `scale` lo aleja o lo acerca. */
function Cactus({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-9" y="-96" width="18" height="140" rx="9" />
      <rect x="-38" y="-62" width="14" height="46" rx="7" />
      <rect x="-38" y="-62" width="34" height="14" rx="7" />
      <rect x="24" y="-78" width="14" height="58" rx="7" />
      <rect x="6" y="-78" width="32" height="14" rx="7" />
    </g>
  );
}
