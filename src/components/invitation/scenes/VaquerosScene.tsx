"use client";

import type { ReactNode } from "react";
import { SceneLayer, SceneParticles, SceneShell } from "./SceneShell";

/**
 * Vaqueros · blanco y negro.
 *
 * Atardecer en el desierto tratado como fotografía monocroma. Dos decisiones
 * mandan sobre el resto:
 *
 *  - Los elementos sueltos —sol, postes— se colocan con CSS en porcentajes, no
 *    dentro de un viewBox ancho. Un SVG apaisado con preserveAspectRatio slice
 *    recorta los lados en pantalla vertical, que es justo donde caerían: en
 *    móvil desaparecerían por completo. Solo lo que abarca todo el ancho
 *    —horizonte y suelo— puede vivir en un SVG a sangre.
 *  - La composición es ASIMÉTRICA: el sol a la izquierda, los postes a la
 *    derecha. La tarjeta ocupa el centro, así que lo demás vive en los márgenes.
 */
export function VaquerosScene({ children }: { children?: ReactNode }) {
  return (
    <SceneShell
      // El punto más cálido va al 72%, a la altura del horizonte: más abajo
      // quedaría bajo el suelo negro y el atardecer no se vería nunca.
      background="linear-gradient(180deg, #100e0b 0%, #1a1712 22%, #302a21 42%, #5d5040 58%, #a08d6e 68%, #ddcaa6 73%, #8d7c62 80%, #2c261e 92%, #14110d 100%)"
      vignette="radial-gradient(88% 72% at 50% 44%, transparent 58%, rgba(12, 11, 9, 0.5) 100%)"
      content={children}
    >
      {/* Estrellas: solo en la franja alta, donde el cielo aún es noche. */}
      <SceneLayer className="absolute inset-x-0 top-0 h-[38vh]" depthX={4} depthY={2}>
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMin slice" className="h-full w-full" role="presentation">
          <g fill="#e8dcc4">
            {STARS.map((star) => (
              <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} opacity={star.o} />
            ))}
          </g>
        </svg>
      </SceneLayer>

      {/* Sol bajo, descentrado a la izquierda. Es la única fuente de luz.
          Va en su propia caja posicionada en % para que el recorte vertical no
          se lo lleve. */}
      <SceneLayer
        className="absolute left-[2%] top-[55%] w-[48vmin] max-w-[400px]"
        depthX={7}
        depthY={4}
      >
        <svg viewBox="0 0 400 400" className="h-auto w-full overflow-visible" role="presentation">
          <defs>
            <radialGradient id="vq-halo">
              <stop offset="0%" stopColor="#fdf6e6" stopOpacity="0.95" />
              <stop offset="26%" stopColor="#e8d5ae" stopOpacity="0.6" />
              <stop offset="58%" stopColor="#a08d70" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#a08d70" stopOpacity="0" />
            </radialGradient>
            {/* Las bandas de calor recortan el disco: el gesto que hace que se
                lea como sol de desierto y no como un círculo cualquiera. */}
            <mask id="vq-haze">
              <rect x="-200" y="-200" width="800" height="800" fill="white" />
              {[0, 1, 2, 3, 4].map((index) => (
                <rect
                  key={index}
                  x="-200"
                  y={188 + index * 30}
                  width="800"
                  height={6 + (index % 2) * 4}
                  fill="black"
                  opacity={0.9 - index * 0.14}
                />
              ))}
            </mask>
          </defs>

          <circle cx="200" cy="200" r="196" fill="url(#vq-halo)" />
          <circle cx="200" cy="200" r="96" fill="#fdf7ea" mask="url(#vq-haze)" opacity="0.94" />
        </svg>
      </SceneLayer>

      {/* Mesetas lejanas: recortadas contra el resplandor, no flotando. */}
      <SceneLayer className="absolute inset-0 opacity-90" depthX={12} depthY={5}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="presentation">
          <g fill="#3b342a" opacity="0.7">
            <Butte x={60} baseY={652} width={420} height={104} step />
            <Butte x={980} baseY={652} width={380} height={86} />
          </g>
          <g fill="#241f19" opacity="0.92">
            <Butte x={-80} baseY={694} width={360} height={70} />
            <Butte x={480} baseY={694} width={520} height={58} />
            <Butte x={1120} baseY={694} width={420} height={92} step />
          </g>
        </svg>
      </SceneLayer>

      {/* Postes de telégrafo: la seña más rápida de "oeste". Van a la derecha,
          fuera del recorrido de la tarjeta, y encogen con la distancia. */}
      <SceneLayer
        className="absolute right-0 bottom-[26%] w-[38vmin] max-w-[330px]"
        depthX={-16}
        depthY={-6}
      >
        <svg viewBox="1080 560 360 200" className="h-auto w-full overflow-visible" role="presentation">
          <g stroke="#15120e" fill="none" strokeLinecap="round">
            {/* El cable cuelga de poste a poste con una catenaria suave. */}
            <path
              d="M1392 588 Q 1330 632 1268 600 Q 1214 636 1168 606 Q 1130 634 1100 612"
              strokeWidth="2.2"
              opacity="0.75"
            />
            <path
              d="M1392 604 Q 1330 650 1268 616 Q 1214 652 1168 622 Q 1130 650 1100 626"
              strokeWidth="1.6"
              opacity="0.55"
            />
          </g>
          <g fill="#15120e">
            <Pole x={1392} baseY={742} height={168} />
            <Pole x={1268} baseY={726} height={132} />
            <Pole x={1168} baseY={716} height={104} />
            <Pole x={1100} baseY={708} height={82} />
          </g>
        </svg>
      </SceneLayer>

      {/* Suelo y vegetación en primer plano, ya en negro pleno. */}
      <SceneLayer className="absolute inset-x-0 bottom-0 h-[46vh]" depthX={-26} depthY={9}>
        <svg viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <path
            d="M0 500 L0 236 C 190 198 360 252 540 226 C 720 200 900 246 1080 218 C 1230 195 1340 224 1440 206 L1440 500 Z"
            fill="#0d0b08"
          />

          <g fill="#0d0b08">
            <Saguaro x={148} y={236} scale={1.35} arms="both" />
            <Saguaro x={288} y={248} scale={0.72} arms="left" />
            <Saguaro x={1276} y={214} scale={1.1} arms="right" />
            <Saguaro x={1180} y={224} scale={0.6} arms="none" />
            <Agave x={392} y={244} scale={0.9} />
            <Agave x={1092} y={222} scale={0.7} />
            <Rock x={520} y={232} scale={1} />
            <Rock x={980} y={224} scale={0.72} />
          </g>

          {/* Matojo rodante, quieto pero inclinado: sugiere el viento. */}
          <g fill="none" stroke="#0d0b08" strokeWidth="2.5" opacity="0.85">
            <g transform="translate(700 246) rotate(14)">
              <circle r="19" />
              <path d="M-19 -4 L19 6 M-14 12 L12 -14 M-6 -18 L4 18 M-18 8 L18 -9" strokeWidth="1.8" />
            </g>
          </g>
        </svg>
      </SceneLayer>

      <SceneParticles
        count={26}
        duration={16}
        animationClass="animate-dust"
        className="size-[3px] rounded-full bg-cream-100/45"
      />
    </SceneShell>
  );
}

/** Estrellas fijas: derivadas de una lista, nunca de Math.random (SSR). */
const STARS = [
  { x: 120, y: 60, r: 1.6, o: 0.8 }, { x: 340, y: 120, r: 1.1, o: 0.55 },
  { x: 520, y: 48, r: 1.4, o: 0.7 }, { x: 700, y: 96, r: 1, o: 0.45 },
  { x: 880, y: 40, r: 1.5, o: 0.75 }, { x: 1060, y: 128, r: 1.2, o: 0.5 },
  { x: 1240, y: 72, r: 1.7, o: 0.85 }, { x: 1380, y: 150, r: 1, o: 0.4 },
  { x: 220, y: 190, r: 1.2, o: 0.4 }, { x: 960, y: 200, r: 1.1, o: 0.35 },
  { x: 640, y: 168, r: 1.3, o: 0.5 }, { x: 1150, y: 22, r: 1.2, o: 0.6 },
];

/**
 * Meseta: cima plana y ancha con laderas cortas en talud, que es lo que
 * distingue una mesa de un cerro. `step` añade un hombro más bajo a un lado
 * para que dos mesetas del mismo tamaño no salgan idénticas.
 */
function Butte({
  x,
  baseY,
  width,
  height,
  step = false,
}: {
  x: number;
  baseY: number;
  width: number;
  height: number;
  step?: boolean;
}) {
  const top = baseY - height;
  // La ladera nunca se come más de un quinto del ancho: si lo hace, la silueta
  // deja de leerse como meseta y se convierte en un pico.
  const slope = Math.min(height * 0.7, width * 0.2);

  if (!step) {
    return (
      <path d={`M${x} ${baseY} L${x + slope} ${top} L${x + width - slope} ${top} L${x + width} ${baseY} Z`} />
    );
  }

  const shoulder = top + height * 0.38;
  return (
    <path
      d={`M${x} ${baseY}
          L${x + slope} ${top}
          L${x + width * 0.56} ${top}
          L${x + width * 0.6} ${shoulder}
          L${x + width - slope * 0.5} ${shoulder}
          L${x + width} ${baseY} Z`}
    />
  );
}

/** Poste de telégrafo con su travesaño y sus aisladores. */
function Pole({ x, baseY, height }: { x: number; baseY: number; height: number }) {
  const top = baseY - height;
  const arm = height * 0.16;

  return (
    <g>
      <rect x={x - 2.4} y={top} width="4.8" height={height} />
      <rect x={x - arm} y={top + height * 0.1} width={arm * 2} height="3.4" />
      <circle cx={x - arm * 0.7} cy={top + height * 0.09} r="2.6" />
      <circle cx={x + arm * 0.7} cy={top + height * 0.09} r="2.6" />
    </g>
  );
}

/** Saguaro. Los brazos son opcionales para que no se repita la misma planta. */
function Saguaro({
  x,
  y,
  scale,
  arms,
}: {
  x: number;
  y: number;
  scale: number;
  arms: "both" | "left" | "right" | "none";
}) {
  const left = arms === "both" || arms === "left";
  const right = arms === "both" || arms === "right";

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-10" y="-118" width="20" height="150" rx="10" />
      {left && (
        <>
          <rect x="-44" y="-76" width="15" height="52" rx="7.5" />
          <rect x="-44" y="-76" width="38" height="15" rx="7.5" />
        </>
      )}
      {right && (
        <>
          <rect x="29" y="-94" width="15" height="66" rx="7.5" />
          <rect x="8" y="-94" width="36" height="15" rx="7.5" />
        </>
      )}
    </g>
  );
}

/** Agave: roseta de pencas rígidas. */
function Agave({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {[-68, -44, -20, 0, 20, 44, 68].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          d="M-5 0 L-2.5 -46 L0 -54 L2.5 -46 L5 0 Z"
        />
      ))}
    </g>
  );
}

/** Peñasco bajo: rompe la horizontal del suelo. */
function Rock({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M-38 0 L-30 -18 L-12 -26 L6 -32 L24 -22 L36 -6 L40 0 Z"
    />
  );
}
