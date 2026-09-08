"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";

/**
 * Barbie · pop rosa.
 *
 * A diferencia de los demás temas, este es CLARO: el fondo va de fucsia arriba
 * a rosa muy pálido abajo, así que la viñeta tiene que ser suave o ensucia el
 * rosa. La profundidad la dan colinas redondeadas superpuestas, no siluetas
 * oscuras.
 */
export function BarbieScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      background="linear-gradient(178deg, #931c5a 0%, #d92e83 22%, #f56aa8 46%, #ffb6d9 72%, #ffe0ef 100%)"
      vignette="radial-gradient(78% 62% at 50% 46%, transparent 52%, rgba(117, 22, 72, 0.34) 100%)"
      content={children}
    >
      {/* Sol de rayos: el gesto pop de la escena. */}
      <SceneLayer className="absolute inset-x-0 top-[10vh] flex justify-center" depthX={8} depthY={5}>
        <svg viewBox="0 0 400 400" className="size-[46vh] opacity-60" role="presentation">
          <g stroke="var(--color-cream-200)" strokeWidth="9" strokeLinecap="round">
            {Array.from({ length: 24 }, (_, index) => {
              const angle = (index * Math.PI * 2) / 24;
              return (
                <line
                  key={index}
                  x1={200 + Math.cos(angle) * 96}
                  y1={200 + Math.sin(angle) * 96}
                  x2={200 + Math.cos(angle) * (index % 2 === 0 ? 176 : 140)}
                  y2={200 + Math.sin(angle) * (index % 2 === 0 ? 176 : 140)}
                />
              );
            })}
          </g>
          <circle cx="200" cy="200" r="84" fill="var(--color-cream-100)" opacity="0.85" />
        </svg>
      </SceneLayer>

      {/* Nubes festoneadas */}
      <SceneLayer className="absolute inset-x-0 top-[26vh] h-[22vh]" depthX={-12} depthY={-5}>
        <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          <g fill="var(--color-cream-100)" opacity="0.55">
            <Cloud x={140} y={70} scale={1.1} />
            <Cloud x={1180} y={44} scale={1.4} />
            <Cloud x={700} y={132} scale={0.75} />
          </g>
        </svg>
      </SceneLayer>

      {/* Colinas: tres capas de rosa cada vez más claro hacia el frente. */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[34vh]" depthX={-18} depthY={6}>
        <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <path
            d="M0 360 L0 214 C 240 128 480 246 720 190 C 960 134 1200 232 1440 168 L1440 360 Z"
            fill="var(--color-sage-300)"
            opacity="0.75"
          />
          <path
            d="M0 360 L0 268 C 260 208 520 300 780 254 C 1040 208 1240 288 1440 246 L1440 360 Z"
            fill="var(--color-cream-200)"
            opacity="0.8"
          />
          <path
            d="M0 360 L0 318 C 300 288 600 336 900 310 C 1140 289 1300 322 1440 306 L1440 360 Z"
            fill="var(--color-cream-100)"
          />
        </svg>
      </SceneLayer>

      {/* Estrellas de cuatro puntas: el destello clásico del brillo de labios. */}
      <SceneLayer className="absolute inset-0" depthX={-26} depthY={-10}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          <g fill="var(--color-cream-50)">
            {[
              { x: 210, y: 210, s: 1.3, d: "0s" },
              { x: 1230, y: 170, s: 1, d: "-1.1s" },
              { x: 380, y: 470, s: 0.7, d: "-2.2s" },
              { x: 1080, y: 520, s: 1.1, d: "-0.6s" },
              { x: 760, y: 120, s: 0.8, d: "-1.7s" },
              { x: 150, y: 640, s: 0.9, d: "-2.7s" },
            ].map((star) => (
              <g
                key={`${star.x}-${star.y}`}
                className="animate-sparkle"
                style={{ transformOrigin: `${star.x}px ${star.y}px`, animationDelay: star.d }}
              >
                <Sparkle x={star.x} y={star.y} scale={star.s} />
              </g>
            ))}
          </g>
        </svg>
      </SceneLayer>

      <SceneParticles
        count={16}
        duration={9}
        animationClass="animate-sparkle"
        className="size-[5px] rotate-45 bg-cream-50/70"
      />
    </SceneShell>
  );
}

/** Nube de tres lóbulos. */
function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="0" cy="0" r="34" />
      <circle cx="42" cy="10" r="26" />
      <circle cx="-40" cy="12" r="24" />
      <rect x="-40" y="0" width="82" height="26" rx="13" />
    </g>
  );
}

/** Destello de cuatro puntas, con las diagonales cóncavas. */
function Sparkle({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M0 -30 C 4 -10 10 -4 30 0 C 10 4 4 10 0 30 C -4 10 -10 4 -30 0 C -10 -4 -4 -10 0 -30 Z"
    />
  );
}
