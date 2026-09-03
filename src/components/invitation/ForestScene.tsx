"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Butterfly,
  Fern,
  Flower,
  FoliageEdge,
  LeafCluster,
  Mushroom,
  Sprig,
} from "@/components/invitation/botanicals";
import { Fireflies } from "@/components/invitation/Fireflies";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { attachParallax } from "@/lib/parallax";

/**
 * Fondo de bosque encantado a pantalla completa.
 *
 * Tres planos de profundidad (lejano, medio y sotobosque) que se desplazan muy
 * ligeramente con el puntero. Todo es SVG estático: el movimiento se resuelve
 * con transform sobre tres grupos, nunca por elemento.
 */
export function ForestScene({ children }: { children?: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = rootRef.current;
    if (!element || prefersReducedMotion) return;
    // Solo con puntero fino: en táctil el parallax no aporta y gasta batería.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    return attachParallax(element);
  }, [prefersReducedMotion]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-dvh w-full overflow-hidden bg-forest-950"
      style={{ ["--parallax-x" as string]: 0, ["--parallax-y" as string]: 0 }}
    >
      {/* Cielo / claro de luz entre los árboles */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 28%, #3d5730 0%, #24371c 38%, #16230f 66%, #0b120a 100%)",
        }}
      />

      {/* Plano lejano: siluetas de árboles difuminadas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70 blur-[2px]"
        style={{
          transform:
            "translate3d(calc(var(--parallax-x) * 10px), calc(var(--parallax-y) * 6px), 0)",
        }}
      >
        <DistantTrees />
      </div>

      {/* Haces de luz */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[70vh] mix-blend-screen"
        style={{
          background:
            "linear-gradient(178deg, rgba(226, 211, 180, 0.22) 0%, rgba(226, 211, 180, 0.06) 45%, transparent 78%)",
        }}
      />

      {/* Plano medio: ramas colgantes desde el borde superior */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[46vh]"
        style={{
          transform:
            "translate3d(calc(var(--parallax-x) * -18px), calc(var(--parallax-y) * -10px), 0)",
        }}
      >
        <CanopyBranches />
      </div>

      {/* Vegetación lateral: el bosque sigue rodeando la invitación una vez
          abierta la cortina. Se mueve algo más que el fondo (parallax). */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[32%] sm:w-[26%] lg:w-[22%]"
        style={{
          transform:
            "translate3d(calc(var(--parallax-x) * -22px), calc(var(--parallax-y) * -8px), 0)",
        }}
      >
        <SideVegetation side="left" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[32%] sm:w-[26%] lg:w-[22%]"
        style={{
          transform:
            "translate3d(calc(var(--parallax-x) * 22px), calc(var(--parallax-y) * -8px), 0)",
        }}
      >
        <SideVegetation side="right" />
      </div>

      {/* Sotobosque inferior */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[34vh]"
        style={{
          transform:
            "translate3d(calc(var(--parallax-x) * -26px), calc(var(--parallax-y) * 8px), 0)",
        }}
      >
        <Undergrowth />
      </div>

      <Fireflies className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Viñeta: enfoca la mirada en el centro */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 48%, transparent 42%, rgba(8, 14, 7, 0.45) 100%)",
        }}
      />

      <div className="relative z-10 min-h-dvh w-full">{children}</div>
    </div>
  );
}

function DistantTrees() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="presentation"
    >
      <g fill="#16260f" opacity="0.9">
        {[
          { x: 90, w: 26, h: 620 },
          { x: 300, w: 18, h: 520 },
          { x: 520, w: 30, h: 680 },
          { x: 760, w: 20, h: 560 },
          { x: 980, w: 34, h: 700 },
          { x: 1200, w: 22, h: 600 },
          { x: 1380, w: 28, h: 640 },
        ].map((trunk) => (
          <path
            key={trunk.x}
            d={`M${trunk.x} 900 L ${trunk.x + trunk.w * 0.35} ${900 - trunk.h} L ${trunk.x + trunk.w} ${900 - trunk.h * 0.92} L ${trunk.x + trunk.w * 1.25} 900 Z`}
          />
        ))}
      </g>

      {/* Copas: ramilletes agrupados, no manchas ovaladas */}
      <g opacity="0.85">
        <FoliageEdge height={340} x={1440} jitter={1440} count={30} size={64} fill="#12210c" seed={2} />
      </g>
      <g opacity="0.7" transform="translate(0 120)">
        <FoliageEdge height={280} x={1440} jitter={1440} count={22} size={52} fill="#182c10" seed={8} />
      </g>
    </svg>
  );
}

/** Columna de vegetación en un lateral de la pantalla. */
function SideVegetation({ side }: { side: "left" | "right" }) {
  const seed = side === "left" ? 4 : 23;

  return (
    <svg
      viewBox="0 0 300 1000"
      preserveAspectRatio={side === "left" ? "xMinYMid slice" : "xMaxYMid slice"}
      className="h-full w-full"
      role="presentation"
    >
      <g transform={side === "right" ? "translate(300 0) scale(-1 1)" : undefined}>
        <FoliageEdge height={1000} x={215} jitter={215} count={22} size={54} fill="#122009" seed={seed} />
        <FoliageEdge height={1000} x={165} jitter={165} count={16} size={40} fill="#1b3111" seed={seed + 7} />

        <g className="animate-leaf-sway" style={{ transformOrigin: "40px 200px" }}>
          <g transform="translate(-10 150) rotate(34)">
            <Fern length={280} bend={80} fill="#223a16" stemColor="#1a2c11" />
          </g>
        </g>
        <g transform="translate(-20 520) rotate(-16)">
          <Sprig length={250} bend={70} leaves={10} fill="#26401a" stemColor="#1a2c11" />
        </g>
        <g
          className="animate-leaf-sway"
          style={{ transformOrigin: "40px 820px", animationDelay: "-4s" }}
        >
          <g transform="translate(-10 880) rotate(-42)">
            <Fern length={300} bend={-80} fill="#223a16" stemColor="#1a2c11" />
          </g>
        </g>
        <g transform="translate(120 700) rotate(-70)">
          <LeafCluster size={46} fill="#1e3413" />
        </g>
      </g>
    </svg>
  );
}

function CanopyBranches() {
  return (
    <svg
      viewBox="0 0 1440 480"
      preserveAspectRatio="xMidYMin slice"
      className="h-full w-full"
      role="presentation"
    >
      <g className="animate-branch-breathe" style={{ transformOrigin: "10% 0%" }}>
        <g transform="translate(-20 -10) rotate(58)">
          <Sprig length={340} bend={120} leaves={12} fill="#2f4620" stemColor="#26381a" />
        </g>
        <g transform="translate(150 -30) rotate(72)">
          <Fern length={300} bend={90} fill="#365023" stemColor="#26381a" />
        </g>
      </g>
      <g className="animate-branch-breathe" style={{ transformOrigin: "90% 0%", animationDelay: "-4s" }}>
        <g transform="translate(1460 -10) rotate(122)">
          <Sprig length={340} bend={-120} leaves={12} fill="#2f4620" stemColor="#26381a" />
        </g>
        <g transform="translate(1290 -30) rotate(108)">
          <Fern length={300} bend={-90} fill="#365023" stemColor="#26381a" />
        </g>
      </g>
      <g transform="translate(720 -20) rotate(96)" opacity="0.75">
        <Sprig length={260} bend={60} leaves={9} fill="#28401c" stemColor="#22331a" />
      </g>
    </svg>
  );
}

function Undergrowth() {
  return (
    <svg
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      className="h-full w-full"
      role="presentation"
    >
      <path
        d="M0 360 L0 250 C 180 210 320 300 480 250 C 640 200 780 290 940 245 C 1100 200 1280 285 1440 235 L1440 360 Z"
        fill="#0f1a0b"
        opacity="0.92"
      />
      <g className="animate-leaf-sway" style={{ transformOrigin: "20% 100%" }}>
        <g transform="translate(120 330) rotate(-78)">
          <Fern length={210} bend={-60} fill="#2c4520" stemColor="#22351a" />
        </g>
        <g transform="translate(240 340) rotate(-96)">
          <Sprig length={170} bend={50} leaves={8} fill="#335023" stemColor="#22351a" />
        </g>
      </g>
      <g className="animate-leaf-sway" style={{ transformOrigin: "80% 100%", animationDelay: "-3.5s" }}>
        <g transform="translate(1300 335) rotate(-104)">
          <Fern length={215} bend={60} fill="#2c4520" stemColor="#22351a" />
        </g>
        <g transform="translate(1180 345) rotate(-84)">
          <Sprig length={165} bend={-50} leaves={8} fill="#335023" stemColor="#22351a" />
        </g>
      </g>
      <g transform="translate(400 348)">
        <Mushroom size={30} cap="#8f5a53" stem="#c9bda0" dots="#e6dcc2" />
      </g>
      <g transform="translate(452 352)">
        <Mushroom size={20} cap="#7d4d47" stem="#c9bda0" dots="#e6dcc2" />
      </g>
      <g transform="translate(1020 350)">
        <Mushroom size={26} cap="#8f5a53" stem="#c9bda0" dots="#e6dcc2" />
      </g>
      <g transform="translate(640 320)" opacity="0.75">
        <Flower radius={11} petal="#6d5a52" petalEdge="#7d6259" heart="#9c7f42" />
      </g>
      <g transform="translate(880 306)" opacity="0.7">
        <Flower radius={9} petal="#6d5a52" petalEdge="#7d6259" heart="#9c7f42" />
      </g>
      <g className="animate-flutter" transform="translate(760 190)" opacity="0.5">
        <Butterfly size={16} wing="#c3ad8a" wingBack="#9c8a68" body="#22351a" />
      </g>
    </svg>
  );
}
