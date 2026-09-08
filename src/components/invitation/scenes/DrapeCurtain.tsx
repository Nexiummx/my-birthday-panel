import type { ReactNode, RefObject } from "react";
import { CURTAIN_BRANCH_CLASS, OpeningCurtain } from "@/components/invitation/OpeningCurtain";
import {
  Agave,
  Barrel,
  Bulb,
  Cocktail,
  Horseshoe,
  Lantern,
  MiniBall,
  Saguaro,
  seeded,
  Sparkle,
  Speaker,
  Vinyl,
  WagonWheel,
} from "./curtain-props";
import type { EventThemeValue } from "@/lib/validations";

interface CurtainProps {
  leftRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
}

/**
 * Telón que oculta la invitación antes de abrirla.
 *
 * Es la primera pantalla que ve el invitado, así que cada tema tiene el suyo:
 * un telón compartido y recoloreado delataba de inmediato que los temas eran
 * el mismo con otra paleta. El bosque abre con vegetación, vaqueros con
 * puertas de cantina, barbie con satén festoneado y disco con terciopelo y
 * fleco dorado.
 */
export function ThemeCurtain({
  theme,
  leftRef,
  rightRef,
}: CurtainProps & { theme: EventThemeValue }) {
  if (theme === "BOSQUE") {
    return <OpeningCurtain leftRef={leftRef} rightRef={rightRef} />;
  }

  // Barbie conserva el telón de tela: el satén con festón le sienta bien.
  if (theme === "BARBIE") {
    return (
      <Panels leftRef={leftRef} rightRef={rightRef}>
        {(side) => <SatinDrape side={side} />}
      </Panels>
    );
  }

  // Vaqueros y Disco se construyen como el bosque: masas de siluetas con el
  // filo interior roto por objetos del tema, no una tela recoloreada.
  return (
    <Panels leftRef={leftRef} rightRef={rightRef}>
      {(side) => (
        <CollagePanel side={side}>
          {theme === "VAQUEROS" ? <WesternPanel side={side} /> : <ClubPanel side={side} />}
        </CollagePanel>
      )}
    </Panels>
  );
}

type Side = "left" | "right";

/** Las dos hojas. Se solapan en el centro para que la apertura nazca de ahí. */
function Panels({
  leftRef,
  rightRef,
  children,
}: CurtainProps & { children: (side: Side) => ReactNode }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        ref={leftRef}
        className="absolute inset-y-0 left-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "left center" }}
      >
        {children("left")}
      </div>
      <div
        ref={rightRef}
        className="absolute inset-y-0 right-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "right center" }}
      >
        {children("right")}
      </div>
    </div>
  );
}

/** Sombra hacia el centro: da volumen al filo que se separa. */
function InnerShadow({ side }: { side: Side }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          side === "left"
            ? "linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 62%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(270deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 62%, rgba(0,0,0,0.5) 100%)",
      }}
    />
  );
}

/**
 * Barbie · satén festoneado.
 *
 * Tela clara con pliegues suaves y un festón de semicírculos recorriendo el
 * canto interior, que es la firma del tema.
 */
function SatinDrape({ side }: { side: Side }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            #b81a74 0px,
            #e0218a 30px,
            #f56aa8 52px,
            #e0218a 74px,
            #a81862 104px
          )`,
        }}
      />
      {/* Brillo del satén: una banda clara que recorre la tela. */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            "linear-gradient(96deg, transparent 20%, rgba(255,255,255,0.2) 42%, rgba(255,255,255,0.06) 52%, transparent 72%)",
        }}
      />

      {/* Festón vertical en el canto interior. */}
      <div
        className={`absolute inset-y-0 flex w-[26px] flex-col justify-around ${
          side === "left" ? "right-0" : "left-0"
        }`}
      >
        {Array.from({ length: 22 }, (_, index) => (
          <span key={index} className="size-[26px] rounded-full bg-cream-100/85" />
        ))}
      </div>

      <InnerShadow side={side} />
    </div>
  );
}

/**
 * Armazón de los telones de collage.
 *
 * Replica la estructura del telón del bosque: un lienzo de 800x1000 alineado
 * por su borde INTERIOR —xMax en la hoja izquierda, xMin en la derecha— para
 * que el filo, que es lo único que de verdad se mira, nunca se recorte. El
 * panel derecho es el izquierdo reflejado.
 */
function CollagePanel({ side, children }: { side: Side; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio={side === "left" ? "xMaxYMid slice" : "xMinYMid slice"}
      className="h-full w-full"
      role="presentation"
    >
      <g transform={side === "right" ? "translate(800 0) scale(-1 1)" : undefined}>{children}</g>
    </svg>
  );
}

/**
 * Modelado de luz del panel: oscuro hacia el exterior, con una insinuación
 * cálida junto al filo interior. Sin él las siluetas se leen planas.
 */
function PanelShade({ side, warm }: { side: Side; warm: string }) {
  const id = `collage-shade-${side}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.9" />
          <stop offset="34%" stopColor="#000000" stopOpacity="0.5" />
          <stop offset="72%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="100%" stopColor={warm} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill={`url(#${id})`} />
    </>
  );
}

/**
 * Pared de roca: perfil quebrado en escalones irregulares.
 *
 * El lienzo va alineado por su borde interior, así que el macizo ocupa desde
 * x=0 —el exterior de la pantalla— hasta una línea dentada que ronda `x`. Los
 * saltos angulosos, y no una curva, son lo que la hace leer como roca.
 */
function RockWall({
  x,
  fill,
  jag,
  steps,
  seed,
}: {
  x: number;
  fill: string;
  jag: number;
  steps: number;
  seed: number;
}) {
  const random = seeded(seed);
  const edge: string[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const y = (1000 * index) / steps;
    const inset = x - random() * jag;
    // Cada escalón repite la x anterior a la altura nueva antes de desplazarse:
    // así el perfil sale en ángulos rectos, como un farallón.
    edge.push(`L${inset} ${y}`);
    edge.push(`L${inset} ${y + 1000 / steps / 2}`);
  }

  return <path d={`M0 0 L${x} 0 ${edge.join(" ")} L0 1000 Z`} fill={fill} />;
}

/**
 * Vaqueros · cañón al anochecer.
 *
 * Paredes de roca en tres planos y, en el filo, una hilera de saguaros y
 * agaves. Delante cruzan los objetos que se leen al instante como oeste: la
 * rueda de carreta, el barril, la herradura y el farol colgado.
 */
function WesternPanel({ side }: { side: Side }) {
  const random = seeded(side === "left" ? 5 : 23);

  return (
    <>
      {/* Tres planos de roca, cada uno con su propio perfil quebrado. */}
      <rect width="800" height="1000" fill="#080605" />
      <RockWall x={800} fill="#0f0c08" jag={70} steps={9} seed={side === "left" ? 2 : 12} />
      <RockWall x={735} fill="#171208" jag={95} steps={7} seed={side === "left" ? 6 : 16} />
      <RockWall x={672} fill="#211a11" jag={120} steps={6} seed={side === "left" ? 9 : 19} />

      <PanelShade side={side} warm="#e8cd94" />

      {/* Hilera de cactus a lo largo del filo: es lo que rompe la silueta. */}
      <g fill="#574c3c">
        {Array.from({ length: 11 }, (_, index) => {
          const y = 60 + index * 92 + random() * 40;
          const x = 600 + random() * 150;
          const height = 90 + random() * 120;
          const arms = (["both", "left", "right", "none"] as const)[Math.floor(random() * 4)];
          return (
            <g key={index} transform={`translate(${x} ${y})`}>
              <Saguaro height={height} arms={arms} />
            </g>
          );
        })}
        {Array.from({ length: 7 }, (_, index) => {
          const y = 130 + index * 138 + random() * 40;
          const x = 690 + random() * 90;
          return (
            <g key={`a${index}`} transform={`translate(${x} ${y})`} fill="#6b5f4a">
              <Agave size={44 + random() * 34} />
            </g>
          );
        })}
      </g>

      {/* Primer plano: cruzan el filo hacia el centro y GSAP los mueve al abrir. */}
      <g className={CURTAIN_BRANCH_CLASS} fill="#9c8b6f" color="#9c8b6f" opacity="0.9">
        <g transform="translate(726 210)">
          <WagonWheel radius={62} />
        </g>
      </g>
      <g className={CURTAIN_BRANCH_CLASS} fill="#8a7a61" color="#8a7a61" opacity="0.92">
        <g transform="translate(700 560)">
          <Barrel height={96} />
        </g>
        <g transform="translate(772 470) rotate(-18)">
          <Horseshoe size={30} />
        </g>
      </g>
      <g className={CURTAIN_BRANCH_CLASS} fill="#e8cd94" color="#8d7a4a" opacity="0.85">
        <g transform="translate(660 156)">
          <Lantern height={62} hang={156} />
        </g>
      </g>
      <g className={CURTAIN_BRANCH_CLASS} fill="#6f6350" color="#6f6350" opacity="0.85">
        <g transform="translate(748 830)">
          <Barrel height={64} />
        </g>
        <g transform="translate(668 900)">
          <WagonWheel radius={44} />
        </g>
      </g>
    </>
  );
}

/**
 * Disco · pared del antro.
 *
 * Paneles verticales al fondo y, en el filo, bolas colgadas a distintas
 * alturas, vinilos, copas y destellos. Los altavoces anclan la composición
 * arriba y abajo.
 */
function ClubPanel({ side }: { side: Side }) {
  const random = seeded(side === "left" ? 11 : 29);

  return (
    <>
      <rect width="800" height="1000" fill="#0a0714" />
      {/* Paneles acústicos: dan fondo sin competir con los objetos. */}
      <g fill="#150e26">
        {Array.from({ length: 9 }, (_, index) => (
          <rect key={index} x={520 + index * 32} y="0" width="22" height="1000" opacity={0.4 + index * 0.06} />
        ))}
      </g>
      {/* Arcos de luz al fondo, tenues. */}
      <g fill="none" stroke="#3a2a55" strokeWidth="3" opacity="0.55">
        <path d="M560 1000 L560 300 A120 120 0 0 1 800 300 L800 1000" />
        <path d="M640 1000 L640 400 A80 80 0 0 1 800 400 L800 1000" />
      </g>

      <PanelShade side={side} warm="#e0c66d" />

      {/* Guirnalda de bombillas bordeando el filo. */}
      <g fill="#e0c66d" opacity="0.8">
        <path
          d="M612 20 Q 700 90 640 170 Q 590 250 690 320 Q 760 380 660 460"
          fill="none"
          stroke="#6b6288"
          strokeWidth="2"
        />
        {[
          [636, 62], [648, 130], [612, 214], [652, 282], [712, 356], [684, 424],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <Bulb size={15} />
          </g>
        ))}
      </g>

      {/* Bolas colgadas a distintas alturas: la seña del tema. */}
      <g fill="#e0c66d">
        {[
          { x: 700, y: 150, r: 42, hang: 150 },
          { x: 596, y: 372, r: 26, hang: 372 },
          { x: 762, y: 560, r: 34, hang: 560 },
          { x: 634, y: 786, r: 22, hang: 786 },
        ].map((ball) => (
          <g key={`${ball.x}-${ball.y}`} transform={`translate(${ball.x} ${ball.y})`} color="#6b6288">
            <MiniBall radius={ball.r} hang={ball.hang} />
          </g>
        ))}
      </g>

      {/* Destellos sueltos por el panel. */}
      <g fill="#f4e3a8">
        {Array.from({ length: 12 }, (_, index) => {
          const x = 540 + random() * 250;
          const y = 40 + index * 78 + random() * 40;
          return (
            <g key={index} transform={`translate(${x} ${y})`} opacity={0.35 + random() * 0.45}>
              <Sparkle size={8 + random() * 14} />
            </g>
          );
        })}
      </g>

      {/* Primer plano: cruzan el filo y GSAP los mueve al abrirse. */}
      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform="translate(756 1000)">
          <Speaker height={300} />
        </g>
        <g transform="translate(664 1000)">
          <Speaker height={196} />
        </g>
      </g>
      <g className={CURTAIN_BRANCH_CLASS}>
        <g transform="translate(694 632) rotate(-14)">
          <Vinyl radius={54} />
        </g>
        <g transform="translate(590 880) rotate(9)">
          <Vinyl radius={34} />
        </g>
      </g>
      <g className={CURTAIN_BRANCH_CLASS} fill="#e0c66d" color="#e0c66d" opacity="0.85">
        <g transform="translate(762 268)">
          <Cocktail height={72} />
        </g>
        <g transform="translate(614 520) rotate(10)">
          <Cocktail height={54} />
        </g>
      </g>
    </>
  );
}
