import type { RefObject } from "react";
import { OpeningCurtain } from "@/components/invitation/OpeningCurtain";
import type { EventThemeValue } from "@/lib/validations";

interface CurtainProps {
  leftRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
}

/**
 * Telón que oculta la invitación antes de abrirla.
 *
 * El bosque tiene el suyo, hecho de vegetación. Los demás temas comparten un
 * telón de tela: los pliegues se dibujan con un degradado repetido sobre los
 * tokens del tema, así que el mismo componente sirve para el terciopelo del
 * disco, el satén de Barbie y el cuero de vaqueros sin ramificar nada.
 */
export function ThemeCurtain({ theme, leftRef, rightRef }: CurtainProps & { theme: EventThemeValue }) {
  if (theme === "BOSQUE") {
    return <OpeningCurtain leftRef={leftRef} rightRef={rightRef} />;
  }
  return <DrapeCurtain leftRef={leftRef} rightRef={rightRef} />;
}

function DrapeCurtain({ leftRef, rightRef }: CurtainProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        ref={leftRef}
        className="absolute inset-y-0 left-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "left center" }}
      >
        <DrapePanel side="left" />
      </div>
      <div
        ref={rightRef}
        className="absolute inset-y-0 right-0 w-[54%] will-change-transform"
        style={{ transformOrigin: "right center" }}
      >
        <DrapePanel side="right" />
      </div>
    </div>
  );
}

function DrapePanel({ side }: { side: "left" | "right" }) {
  return (
    <div className="relative h-full w-full">
      {/* Tela: los pliegues son un degradado repetido, no elementos sueltos. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            repeating-linear-gradient(
              90deg,
              var(--color-forest-900) 0px,
              var(--color-forest-700) 34px,
              var(--color-forest-900) 68px
            )`,
        }}
      />

      {/* Sombra hacia el centro de la pantalla: da volumen al borde que se
          separa, que es el único que el ojo sigue durante la apertura. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            side === "left"
              ? "linear-gradient(90deg, transparent 55%, rgba(0,0,0,0.55) 100%)"
              : "linear-gradient(270deg, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Filo metálico interior: el remate que atrapa la luz al abrirse. */}
      <div
        className={`absolute inset-y-0 w-[6px] ${side === "left" ? "right-0" : "left-0"}`}
        style={{
          background:
            "linear-gradient(180deg, var(--color-gold-300), var(--color-gold-500) 45%, var(--color-gold-600))",
        }}
      />
    </div>
  );
}
