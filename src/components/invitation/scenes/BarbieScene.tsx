"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";
import { round } from "./geometry";

/**
 * Barbie · pop rosa.
 *
 * Es el único tema CLARO, así que aquí el problema no es que la escena se hunda
 * en negro sino que se lave: todo lo blanco sobre rosa pierde fuerza. De ahí
 * dos decisiones:
 *
 *  - El motivo central es un ARCO FESTONEADO que enmarca la invitación como la
 *    ventana de una caja de muñeca. Rodea la tarjeta en lugar de quedar detrás,
 *    que era el error de la versión anterior: un sol de rayos centrado solo
 *    asomaba en muñones sueltos.
 *  - Los adornos viven en las bandas de arriba y abajo y en los márgenes
 *    laterales, nunca en el centro, porque ahí la tarjeta los tapa.
 */
export function BarbieScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      background="linear-gradient(178deg, #6d1240 0%, #a81862 16%, #d92e83 38%, #f56aa8 62%, #ffa8d0 82%, #ffd4e8 100%)"
      vignette="radial-gradient(86% 70% at 50% 44%, transparent 56%, rgba(109, 18, 64, 0.42) 100%)"
      content={children}
    >
      {/* Rayos: nacen arriba, por encima de la tarjeta, y se abren hacia fuera. */}
      <SceneLayer className="absolute inset-x-0 -top-[26vmin] flex justify-center" depthX={7} depthY={4}>
        <svg viewBox="0 0 400 400" className="w-[130vmin] max-w-[1100px]" role="presentation">
          <g fill="#fff2f8">
            {Array.from({ length: 28 }, (_, index) => {
              const angle = (index * 360) / 28;
              const long = index % 2 === 0;
              return (
                <path
                  key={index}
                  transform={`rotate(${angle} 200 200)`}
                  d={`M200 200 L${196} ${long ? 20 : 76} L${204} ${long ? 20 : 76} Z`}
                  opacity={long ? 0.3 : 0.18}
                />
              );
            })}
          </g>
          <circle cx="200" cy="200" r="52" fill="#fff6fa" opacity="0.5" />
        </svg>
      </SceneLayer>

      {/* Arco festoneado: la ventana de la caja. Enmarca la invitación. */}
      <SceneLayer className="absolute inset-x-0 top-[6%] flex justify-center" depthX={-9} depthY={-4}>
        <svg
          viewBox="0 0 340 430"
          preserveAspectRatio="xMidYMin meet"
          className="h-[86vh] w-[72vmin] max-w-[640px] overflow-visible"
          role="presentation"
        >
          {/* Doble filete: uno grueso translúcido y otro fino encima, que es lo
              que da sensación de moldura y no de contorno plano. */}
          <path
            d="M18 430 L18 170 A152 152 0 0 1 322 170 L322 430"
            fill="none"
            stroke="#fff2f8"
            strokeWidth="9"
            opacity="0.3"
          />
          <path
            d="M18 430 L18 170 A152 152 0 0 1 322 170 L322 430"
            fill="none"
            stroke="#fff6fa"
            strokeWidth="2"
            opacity="0.65"
          />
          {/* Festón: semicírculos tangentes POR FUERA del arco. Centrados sobre
              la propia línea leerían como burbujas sueltas. */}
          <g fill="#fff6fa" opacity="0.5">
            {Array.from({ length: 17 }, (_, index) => {
              const angle = Math.PI * (1 - index / 16);
              const radius = 152 + 8;
              return (
                <circle
                  key={index}
                  cx={round(170 + Math.cos(angle) * radius)}
                  cy={round(170 - Math.sin(angle) * radius)}
                  r="8"
                />
              );
            })}
          </g>
        </svg>
      </SceneLayer>

      {/* Confeti en los márgenes: corazones, estrellas y lunares. */}
      <SceneLayer className="absolute inset-0" depthX={-20} depthY={-9}>
        <svg viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          <g fill="#fff6fa">
            {CONFETTI.map((piece, index) => (
              <g
                key={index}
                transform={`translate(${piece.x} ${piece.y}) rotate(${piece.r}) scale(${piece.s})`}
                opacity={piece.o}
              >
                {piece.kind === "heart" && (
                  <path d="M0 8 C -12 -2 -10 -14 -3 -14 C 0 -14 0 -11 0 -10 C 0 -11 0 -14 3 -14 C 10 -14 12 -2 0 8 Z" />
                )}
                {piece.kind === "star" && (
                  <path d="M0 -13 C 1.6 -4.4 4.4 -1.6 13 0 C 4.4 1.6 1.6 4.4 0 13 C -1.6 4.4 -4.4 1.6 -13 0 C -4.4 -1.6 -1.6 -4.4 0 -13 Z" />
                )}
                {piece.kind === "dot" && <circle r="5" />}
              </g>
            ))}
          </g>
        </svg>
      </SceneLayer>

      {/* Brillo de plástico: una banda diagonal muy tenue, como el reflejo de
          una vitrina. */}
      <SceneLayer className="absolute inset-0" depthX={5} depthY={3}>
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              "linear-gradient(104deg, transparent 34%, rgba(255,255,255,0.14) 44%, rgba(255,255,255,0.05) 50%, transparent 58%)",
          }}
        />
      </SceneLayer>

      {/* Tarima festoneada: cierra la composición por abajo. */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[22vh]" depthX={-16} depthY={7}>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <g fill="#fff6fa" opacity="0.55">
            {Array.from({ length: 25 }, (_, index) => (
              <circle key={index} cx={index * 60} cy="86" r="34" />
            ))}
            <rect x="0" y="86" width="1440" height="134" />
          </g>
          <rect x="0" y="118" width="1440" height="102" fill="#ffd4e8" opacity="0.6" />
        </svg>
      </SceneLayer>

      <SceneParticles
        count={14}
        duration={8}
        animationClass="animate-sparkle"
        className="size-[6px] rotate-45 bg-cream-50/80"
      />
    </SceneShell>
  );
}

/**
 * Confeti fijo. Las coordenadas viven en un viewBox de 700x900 —vertical, no
 * apaisado— y se agrupan en las columnas laterales: en el centro la tarjeta las
 * taparía, y más allá de los márgenes el recorte se las come.
 */
const CONFETTI = [
  { kind: "heart", x: 86, y: 180, s: 1.7, r: -14, o: 0.8 },
  { kind: "star", x: 152, y: 292, s: 1.3, r: 0, o: 0.62 },
  { kind: "dot", x: 62, y: 386, s: 1.4, r: 0, o: 0.5 },
  { kind: "heart", x: 130, y: 498, s: 1.4, r: 16, o: 0.6 },
  { kind: "star", x: 66, y: 612, s: 1.6, r: 10, o: 0.72 },
  { kind: "dot", x: 148, y: 706, s: 1.2, r: 0, o: 0.45 },
  { kind: "heart", x: 614, y: 206, s: 1.6, r: 12, o: 0.78 },
  { kind: "star", x: 548, y: 320, s: 1.3, r: -8, o: 0.6 },
  { kind: "dot", x: 636, y: 424, s: 1.3, r: 0, o: 0.5 },
  { kind: "heart", x: 566, y: 540, s: 1.4, r: -18, o: 0.64 },
  { kind: "star", x: 632, y: 648, s: 1.6, r: 6, o: 0.72 },
  { kind: "dot", x: 552, y: 742, s: 1.1, r: 0, o: 0.42 },
] as const;
