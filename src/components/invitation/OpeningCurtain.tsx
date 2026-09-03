import type { RefObject } from "react";
import {
  Berries,
  Butterfly,
  Fern,
  Flower,
  FoliageEdge,
  FoliageMass,
  LeafCluster,
  Mushroom,
  Sprig,
} from "@/components/invitation/botanicals";

/** Clase que GSAP usa para dar movimiento secundario a las ramas del frente. */
export const CURTAIN_BRANCH_CLASS = "curtain-branch";

/**
 * Las dos "cortinas" de vegetación que ocultan la invitación.
 *
 * Cada panel ocupa un 54% del ancho, de modo que ambos se solapan en el centro
 * de la pantalla: la apertura arranca exactamente desde ahí. El SVG se alinea
 * por su borde interior (xMax en el izquierdo, xMin en el derecho) para que el
 * filo vegetal —lo que realmente se ve— nunca se recorte, ni en móvil.
 */
export function OpeningCurtain({
  leftRef,
  rightRef,
}: {
  leftRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        ref={leftRef}
        className="absolute inset-y-0 left-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "left center" }}
      >
        <CurtainPanel side="left" />
      </div>
      <div
        ref={rightRef}
        className="absolute inset-y-0 right-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "right center" }}
      >
        <CurtainPanel side="right" />
      </div>
    </div>
  );
}

function CurtainPanel({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio={side === "left" ? "xMaxYMid slice" : "xMinYMid slice"}
      className="h-full w-full"
      role="presentation"
    >
      {/* El panel derecho es el izquierdo reflejado, con su propia variación. */}
      <g transform={side === "right" ? "translate(800 0) scale(-1 1)" : undefined}>
        <PanelContent variant={side} />
      </g>
    </svg>
  );
}

function PanelContent({ variant }: { variant: "left" | "right" }) {
  // Semillas distintas por lado: el panel derecho no es un espejo exacto.
  const isLeft = variant === "left";
  const seed = isLeft ? 3 : 17;
  const offset = isLeft ? 0 : 34;
  const delay = isLeft ? "0s" : "-3s";

  return (
    <>
      {/* Tres masas de follaje en profundidad, cada una con su propio filo */}
      <FoliageMass width={800} height={1000} lobes={7} depth={150} fill="#0d180a" seed={seed} />
      <FoliageMass
        width={745}
        height={1000}
        lobes={10}
        depth={170}
        fill="#18290f"
        seed={seed + 5}
      />
      <FoliageMass
        width={690}
        height={1000}
        lobes={8}
        depth={140}
        fill="#233718"
        opacity={0.95}
        seed={seed + 9}
      />

      {/* Modelado de luz del panel: se oscurece hacia el exterior y guarda una
          insinuación cálida junto al filo interior. Da el relieve que unas
          siluetas planas no consiguen por sí solas. */}
      <defs>
        <linearGradient id={`panel-shade-${variant}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#040903" stopOpacity="0.92" />
          <stop offset="32%" stopColor="#0a1407" stopOpacity="0.55" />
          <stop offset="68%" stopColor="#0a1407" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#e8cd94" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`panel-depth-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040903" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#040903" stopOpacity="0" />
          <stop offset="100%" stopColor="#040903" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width={800} height={1000} fill={`url(#panel-shade-${variant})`} />

      {/* Vegetación repartida por todo el panel: en desktop se ve el bosque
          completo alrededor, no solo una franja central. */}
      <FoliageEdge
        height={1000}
        x={470}
        jitter={520}
        count={26}
        size={58}
        fill="#152510"
        seed={seed + 41}
      />
      <FoliageEdge
        height={1000}
        x={580}
        jitter={430}
        count={22}
        size={42}
        fill="#1f3616"
        seed={seed + 53}
      />

      {/* Ramilletes que rompen la silueta: el filo se lee como vegetación */}
      <FoliageEdge height={1000} x={655} count={26} size={40} fill="#2c4419" seed={seed + 13} />
      <FoliageEdge
        height={1000}
        x={700}
        jitter={120}
        count={18}
        size={30}
        fill="#3a5a23"
        seed={seed + 21}
      />
      <FoliageEdge
        height={1000}
        x={735}
        jitter={80}
        count={11}
        size={24}
        fill="#4a6d2d"
        seed={seed + 29}
      />

      {/* Ramas del frente: cruzan el filo hacia el centro de la pantalla */}
      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform={`translate(560 ${70 + offset}) rotate(34)`}>
          <Sprig length={330} bend={95} leaves={12} fill="#43642a" stemColor="#2a3f1b" />
        </g>
        <g transform={`translate(690 ${150 + offset}) rotate(-12)`}>
          <LeafCluster size={46} fill="#4f7233" />
        </g>
      </g>

      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform={`translate(520 ${300 - offset}) rotate(8)`}>
          <Fern length={340} bend={80} fill="#4c6a31" stemColor="#33481f" />
        </g>
        <g transform={`translate(612 ${340 - offset}) rotate(-24)`}>
          <Flower radius={18} />
        </g>
        <g transform={`translate(668 ${446 - offset}) rotate(12)`}>
          <Flower radius={12} petal="var(--color-blush-200)" petalEdge="var(--color-blush-300)" />
        </g>
        <g transform={`translate(430 ${262 + offset}) rotate(8)`}>
          <Flower radius={14} petal="var(--color-blush-300)" />
        </g>
      </g>

      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform={`translate(545 ${580 + offset}) rotate(-14)`}>
          <Sprig length={330} bend={-70} leaves={11} fill="#456630" stemColor="#2d431d" />
        </g>
        <g transform={`translate(775 ${540 + offset})`}>
          <Berries color="var(--color-blush-400)" size={7} />
        </g>
        <g transform={`translate(700 ${640 + offset}) rotate(24)`}>
          <LeafCluster size={38} fill="#3f5f28" />
        </g>
      </g>

      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform={`translate(505 ${880 - offset}) rotate(-34)`}>
          <Fern length={350} bend={-95} fill="#38512a" stemColor="#2a3d1c" />
        </g>
        <g transform={`translate(690 ${760 - offset}) rotate(-6)`}>
          <Sprig length={230} bend={75} leaves={9} fill="#4c6a31" stemColor="#33481f" />
        </g>
      </g>

      <rect width={800} height={1000} fill={`url(#panel-depth-${variant})`} />

      {/* Sotobosque del panel: hongos y flores bajas */}
      <g transform="translate(690 995)">
        <Mushroom size={42} />
      </g>
      <g transform="translate(756 1000)">
        <Mushroom size={28} cap="var(--color-blush-500)" />
      </g>
      <g transform={`translate(620 ${975 - offset})`}>
        <Flower radius={14} />
      </g>
      <g transform="translate(800 960) rotate(-140)">
        <Fern length={190} bend={-50} fill="#3d5b26" stemColor="#2a3d1c" />
      </g>

      {/* Hojas sueltas con vaivén propio (CSS, no GSAP: son decorativas) */}
      <g
        className="animate-leaf-sway"
        style={{ transformOrigin: "770px 210px", animationDelay: delay }}
      >
        <g transform="translate(775 200) rotate(52)">
          <Sprig length={165} bend={-45} leaves={7} fill="#5b7a3b" stemColor="#3a5124" />
        </g>
      </g>
      <g
        className="animate-leaf-sway"
        style={{ transformOrigin: "760px 690px", animationDelay: "-5s" }}
      >
        <g transform="translate(765 690) rotate(-56)">
          <Sprig length={155} bend={45} leaves={7} fill="#5b7a3b" stemColor="#3a5124" />
        </g>
      </g>

      <g className="animate-flutter" transform={`translate(790 ${450 + offset})`}>
        <Butterfly size={21} />
      </g>
      <g
        className="animate-flutter"
        transform={`translate(735 ${800 - offset})`}
        style={{ animationDelay: "-4.5s" }}
      >
        <Butterfly size={16} wing="var(--color-gold-300)" wingBack="var(--color-blush-200)" />
      </g>
    </>
  );
}
