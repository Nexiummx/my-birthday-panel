"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";

/**
 * Noche de Brillos · disco.
 *
 * Salón a oscuras: la bola de espejos cuelga arriba y de ella salen los haces
 * que iluminan la escena. Todo el color vive en los haces y en el suelo; las
 * paredes son casi negras para que el oro de la lámina resalte.
 */
export function DiscoScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      background="radial-gradient(115% 80% at 50% 12%, #2c2140 0%, #1a1329 32%, #0d0a16 62%, #08060e 100%)"
      vignette="radial-gradient(74% 58% at 50% 46%, transparent 40%, rgba(8, 6, 14, 0.78) 100%)"
      content={children}
    >
      {/* Haces de luz que bajan de la bola, en mezcla aditiva. */}
      <SceneLayer className="absolute inset-x-0 top-0 h-[80vh] mix-blend-screen" depthX={10} depthY={4}>
        <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMin slice" className="h-full w-full" role="presentation">
          <defs>
            <linearGradient id="disco-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-300)" stopOpacity="0.5" />
              <stop offset="70%" stopColor="var(--color-olive-600)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-olive-600)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g fill="url(#disco-beam)">
            {[-46, -26, -8, 12, 30, 52].map((angle) => (
              <path
                key={angle}
                transform={`rotate(${angle} 720 96)`}
                d="M720 96 L648 800 L792 800 Z"
              />
            ))}
          </g>
        </svg>
      </SceneLayer>

      {/* Bola de espejos */}
      <SceneLayer className="absolute inset-x-0 top-0 flex justify-center" depthX={-8} depthY={-4}>
        <svg viewBox="0 0 200 260" className="h-[30vh]" role="presentation">
          <line x1="100" y1="0" x2="100" y2="52" stroke="var(--color-ink-500)" strokeWidth="3" />
          <circle cx="100" cy="116" r="62" fill="var(--color-forest-700)" />
          {/* Facetas: dos familias de líneas bastan para leerla como esfera. */}
          <g stroke="var(--color-gold-400)" strokeWidth="1.4" opacity="0.55">
            {[-48, -32, -16, 0, 16, 32, 48].map((offset) => (
              <ellipse key={offset} cx="100" cy={116 + offset} rx={Math.sqrt(Math.max(1, 62 * 62 - offset * offset))} ry="5" fill="none" />
            ))}
            {[-48, -32, -16, 0, 16, 32, 48].map((offset) => (
              <ellipse key={`v${offset}`} cx={100 + offset} cy="116" rx="5" ry={Math.sqrt(Math.max(1, 62 * 62 - offset * offset))} fill="none" />
            ))}
          </g>
          <circle cx="78" cy="94" r="18" fill="var(--color-gold-300)" opacity="0.4" />
        </svg>
      </SceneLayer>

      {/* Suelo iluminado */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[30vh]" depthX={-20} depthY={7}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(201, 162, 39, 0.22) 0%, rgba(194, 24, 91, 0.12) 38%, transparent 100%)",
          }}
        />
        <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" role="presentation">
          <path d="M0 300 L0 210 C 300 190 600 226 900 204 C 1140 186 1300 214 1440 196 L1440 300 Z" fill="var(--color-forest-950)" opacity="0.85" />
        </svg>
      </SceneLayer>

      {/* Destellos de las facetas repartidos por la sala. */}
      <SceneLayer className="absolute inset-0" depthX={-28} depthY={-12}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          <g fill="var(--color-gold-300)">
            {[
              { x: 240, y: 300, s: 1.2, d: "0s" },
              { x: 1200, y: 260, s: 0.9, d: "-1.4s" },
              { x: 420, y: 600, s: 0.7, d: "-2.4s" },
              { x: 1020, y: 640, s: 1, d: "-0.8s" },
              { x: 700, y: 240, s: 0.6, d: "-1.9s" },
            ].map((flash) => (
              <g
                key={`${flash.x}-${flash.y}`}
                className="animate-sparkle"
                style={{ transformOrigin: `${flash.x}px ${flash.y}px`, animationDelay: flash.d }}
              >
                <path
                  transform={`translate(${flash.x} ${flash.y}) scale(${flash.s})`}
                  d="M0 -34 C 3 -11 11 -3 34 0 C 11 3 3 11 0 34 C -3 11 -11 3 -34 0 C -11 -3 -3 -11 0 -34 Z"
                />
              </g>
            ))}
          </g>
        </svg>
      </SceneLayer>

      <SceneParticles
        count={20}
        duration={7}
        animationClass="animate-sparkle"
        className="size-[4px] rotate-45 bg-gold-300/80"
      />
    </SceneShell>
  );
}
