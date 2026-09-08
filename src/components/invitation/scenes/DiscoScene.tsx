"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";
import { round } from "./geometry";

/**
 * Noche de Brillos · disco.
 *
 * La bola de espejos es el elemento que hace o rompe el tema. La primera
 * versión la dibujaba con elipses cruzadas y leía como una jaula de alambre;
 * esta la construye con FACETAS: filas de cuadriláteros cuyo ancho se estrecha
 * hacia los polos siguiendo la curvatura, cada uno con su propio tono según de
 * dónde le llega la luz. Eso es lo que la hace esférica.
 *
 * La bola no gira: giran los haces. Es lo que pasa en realidad y además evita
 * repintar decenas de facetas en cada fotograma.
 */
export function DiscoScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      background="radial-gradient(120% 82% at 50% 6%, #37294f 0%, #241a38 26%, #140e24 52%, #0b0716 76%, #06040d 100%)"
      vignette="radial-gradient(82% 66% at 50% 44%, transparent 48%, rgba(6, 4, 13, 0.8) 100%)"
      content={children}
    >
      {/* Haces desde la bola. Barren muy despacio de lado a lado. */}
      <SceneLayer className="absolute inset-x-0 top-0 h-[92vh] mix-blend-screen" depthX={9} depthY={4}>
        <svg
          viewBox="0 0 1000 900"
          preserveAspectRatio="xMidYMin slice"
          className="animate-beams h-full w-full"
          role="presentation"
        >
          <defs>
            <linearGradient id="dc-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f4e3a8" stopOpacity="0.5" />
              <stop offset="42%" stopColor="#d4af37" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#c2185b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dc-beam-pink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f07fb0" stopOpacity="0.36" />
              <stop offset="52%" stopColor="#c2185b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#c2185b" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[-62, -40, -22, -8, 8, 22, 40, 62].map((angle, index) => (
            <path
              key={angle}
              transform={`rotate(${angle} 500 108)`}
              d={`M500 108 L${470 - index * 3} 900 L${530 + index * 3} 900 Z`}
              fill={index % 3 === 1 ? "url(#dc-beam-pink)" : "url(#dc-beam)"}
            />
          ))}
        </svg>
      </SceneLayer>

      {/* Bola de espejos, colgada arriba del todo. */}
      <SceneLayer className="absolute inset-x-0 top-0 flex justify-center" depthX={-7} depthY={-3}>
        <MirrorBall />
      </SceneLayer>

      {/* Bokeh: reflejos desenfocados repartidos por la sala. */}
      <SceneLayer className="absolute inset-0" depthX={-15} depthY={-7}>
        <svg viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          {BOKEH.map((light, index) => (
            <circle
              key={index}
              cx={light.x}
              cy={light.y}
              r={light.r}
              fill={light.gold ? "#e0c66d" : "#d94a80"}
              opacity={light.o}
              style={{ filter: `blur(${light.blur}px)` }}
            />
          ))}
        </svg>
      </SceneLayer>

      {/* Pista de baile en perspectiva: las líneas convergen hacia el fondo. */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[30vh]" depthX={-18} depthY={7}>
        <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <defs>
            <linearGradient id="dc-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a227" stopOpacity="0" />
              <stop offset="55%" stopColor="#c9a227" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#c2185b" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1440" height="300" fill="url(#dc-floor)" />

          <g stroke="#e0c66d" strokeWidth="1.1" opacity="0.28">
            {/* Longitudinales: todas salen del punto de fuga. */}
            {Array.from({ length: 17 }, (_, index) => (
              <line key={index} x1="720" y1="0" x2={index * 90 - 40} y2="300" />
            ))}
            {/* Transversales: se separan al acercarse, que es lo que da la
                sensación de profundidad. */}
            {[18, 46, 88, 148, 226, 300].map((y) => (
              <line key={y} x1="0" y1={y} x2="1440" y2={y} />
            ))}
          </g>
        </svg>
      </SceneLayer>

      <SceneParticles
        count={22}
        duration={6}
        animationClass="animate-sparkle"
        className="size-[4px] rotate-45 bg-gold-300/90"
      />
    </SceneShell>
  );
}

/** Reflejos desenfocados. Fijos, nunca aleatorios: el SSR debe coincidir. */
const BOKEH = [
  { x: 92, y: 250, r: 26, o: 0.3, blur: 7, gold: true },
  { x: 148, y: 430, r: 16, o: 0.26, blur: 5, gold: false },
  { x: 62, y: 596, r: 21, o: 0.22, blur: 6, gold: true },
  { x: 168, y: 742, r: 13, o: 0.28, blur: 4, gold: false },
  { x: 606, y: 286, r: 22, o: 0.3, blur: 6, gold: false },
  { x: 546, y: 452, r: 15, o: 0.24, blur: 5, gold: true },
  { x: 642, y: 620, r: 25, o: 0.26, blur: 7, gold: true },
  { x: 560, y: 768, r: 14, o: 0.22, blur: 4, gold: false },
];

/**
 * Bola de espejos por facetas.
 *
 * Cada fila es una banda de latitud: su medio ancho sale de sqrt(r² - y²), así
 * que las bandas se estrechan hacia los polos. Dentro de cada banda las
 * columnas se reparten por ÁNGULO, no por distancia, de modo que las facetas
 * se comprimen hacia los bordes igual que en una esfera real.
 */
function MirrorBall() {
  const radius = 96;
  const rows = 11;
  const cols = 14;
  const facets: Array<{ d: string; fill: string; opacity: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    const y0 = -radius + (2 * radius * row) / rows;
    const y1 = -radius + (2 * radius * (row + 1)) / rows;
    const halfTop = Math.sqrt(Math.max(0, radius * radius - y0 * y0));
    const halfBottom = Math.sqrt(Math.max(0, radius * radius - y1 * y1));

    for (let col = 0; col < cols; col += 1) {
      const a0 = (Math.PI * col) / cols;
      const a1 = (Math.PI * (col + 1)) / cols;
      const cos0 = -Math.cos(a0);
      const cos1 = -Math.cos(a1);

      // Trapecio: los lados de arriba y abajo tienen anchos distintos.
      const d = [
        `M${round(cos0 * halfTop)} ${round(y0)}`,
        `L${round(cos1 * halfTop)} ${round(y0)}`,
        `L${round(cos1 * halfBottom)} ${round(y1)}`,
        `L${round(cos0 * halfBottom)} ${round(y1)}`,
        "Z",
      ].join(" ");

      // Luz desde arriba a la izquierda. Se añade una variación estable por
      // índice para que unas facetas brillen más que sus vecinas.
      const nx = ((cos0 + cos1) / 2) * (halfTop / radius);
      const ny = (y0 + y1) / (2 * radius);
      const jitter = (((row * 7 + col * 13) % 11) - 5) / 32;
      const light = Math.max(0, Math.min(1, 0.56 - nx * 0.34 - ny * 0.42 + jitter));

      facets.push({
        d,
        fill: light > 0.74 ? "#fdf3d0" : light > 0.5 ? "#e0c66d" : light > 0.3 ? "#8d7a3f" : "#3c3352",
        opacity: 0.55 + light * 0.45,
      });
    }
  }

  // El viewBox arranca en 0 y la bola se centra en 141: así el cordón nace en
  // el borde superior de la pantalla y la esfera cabe entera. Centrada en el
  // origen quedaba cortada por arriba y el cordón caía dentro de ella.
  return (
    <svg viewBox="-140 0 280 300" className="h-[34vh] max-h-[320px]" role="presentation">
      {/* Cordón del que cuelga: baja hasta tocar la cúspide de la bola. */}
      <line x1="0" y1="0" x2="0" y2="44" stroke="#6b6288" strokeWidth="2.5" />

      <g transform="translate(0 141)">
        {/* Halo: la bola derrama luz sobre lo que la rodea. */}
        <circle r="150" fill="url(#dc-ball-halo)" opacity="0.5" />
        <defs>
          <radialGradient id="dc-ball-halo">
            <stop offset="40%" stopColor="#e0c66d" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#e0c66d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle r={97} fill="#241d38" />
        <g strokeWidth="0.6" stroke="#1b1630">
          {facets.map((facet, index) => (
            <path key={index} d={facet.d} fill={facet.fill} opacity={facet.opacity} />
          ))}
        </g>

        {/* Brillo especular y borde: rematan el volumen. */}
        <circle cx="-34" cy="-36" r="22" fill="#fff8e2" opacity="0.5" style={{ filter: "blur(9px)" }} />
        <circle r="97" fill="none" stroke="#f4e3a8" strokeWidth="1.2" opacity="0.4" />
      </g>
    </svg>
  );
}
