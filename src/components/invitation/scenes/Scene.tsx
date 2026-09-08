"use client";

import type { ReactNode } from "react";
import { ForestScene } from "@/components/invitation/ForestScene";
import { ForegroundFauna } from "@/components/invitation/ForegroundFauna";
import { BarbieScene } from "./BarbieScene";
import { DiscoScene } from "./DiscoScene";
import { VaquerosScene } from "./VaquerosScene";
import type { EventThemeValue } from "@/lib/validations";

const SCENES: Record<EventThemeValue, (props: { children?: ReactNode }) => ReactNode> = {
  BOSQUE: ForestScene,
  VAQUEROS: VaquerosScene,
  BARBIE: BarbieScene,
  DISCO: DiscoScene,
};

/** Fondo a pantalla completa del tema, con la invitación dentro. */
export function Scene({ theme, children }: { theme: EventThemeValue; children?: ReactNode }) {
  const Component = SCENES[theme] ?? ForestScene;
  return <Component>{children}</Component>;
}

/**
 * Capa que pasa POR DELANTE de la tarjeta. Solo el bosque la usa hoy — sus
 * mariposas cruzan la pantalla entera; los demás temas resuelven su ambiente
 * dentro de la propia escena.
 */
export function SceneForeground({ theme }: { theme: EventThemeValue }) {
  if (theme !== "BOSQUE") return null;
  return <ForegroundFauna />;
}
