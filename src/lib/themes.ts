/**
 * Catálogo de temas de la experiencia pública.
 *
 * Un tema no es solo una paleta: son cuatro cosas que tienen que viajar juntas.
 *
 *   1. Colores      → globals.css, bajo [data-theme="…"].
 *   2. Tipografías  → src/app/i/[slug]/fonts.ts, expuestas como variables CSS
 *                     que el bloque [data-theme] reasigna.
 *   3. Escena       → src/components/invitation/scenes/, resuelta por <Scene>.
 *   4. Textos       → `copy` de aquí, que el anfitrión puede sobrescribir por
 *                     evento desde el panel.
 *
 * Este módulo no importa nada del servidor a propósito: lo consumen tanto los
 * componentes de cliente de la invitación como las pantallas del panel.
 */
import type { EventThemeValue } from "@/lib/validations";

/** Textos de la pantalla de bienvenida, antes de abrir la invitación. */
export interface ThemeCopy {
  /** Línea corta en versalitas sobre el titular. */
  eyebrow: string;
  /** Titular de la portada. */
  headline: string;
  /** Texto del botón que abre la invitación. */
  cta: string;
}

export interface ThemeDefinition {
  id: EventThemeValue;
  /** Nombre visible en el selector del panel. */
  label: string;
  /** Una línea describiendo el registro visual, para el selector. */
  tagline: string;
  /** Valor de data-theme que activa la paleta. */
  attribute: string;
  copy: ThemeCopy;
  /** Tres colores de muestra para el selector: fondo, acento y papel. */
  swatch: readonly [string, string, string];
}

export const THEMES: Record<EventThemeValue, ThemeDefinition> = {
  BOSQUE: {
    id: "BOSQUE",
    label: "Bosque Encantado",
    tagline: "Verde, crema y dorado tenue. Romántico y natural.",
    attribute: "bosque",
    copy: {
      eyebrow: "Estás invitada",
      headline: "Un espacio guardado solo para ti en este cuento",
      cta: "Haz clic para descubrir",
    },
    swatch: ["#1f3117", "#bd9d5a", "#fdfaf3"],
  },
  VAQUEROS: {
    id: "VAQUEROS",
    label: "Vaqueros",
    tagline: "Blanco y negro, cuero y polvo. Rústico y con carácter.",
    attribute: "vaqueros",
    copy: {
      eyebrow: "Se busca",
      headline: "Tu lugar en la mesa ya tiene nombre",
      cta: "Ábrela de un empujón",
    },
    swatch: ["#14120f", "#a89b80", "#f6f2e8"],
  },
  BARBIE: {
    id: "BARBIE",
    label: "Barbie",
    tagline: "Fucsia y rosa chicle. Pop, brillante y divertido.",
    attribute: "barbie",
    copy: {
      eyebrow: "Estás invitada",
      headline: "Nada de esto sería lo mismo sin ti",
      cta: "Descubre tu invitación",
    },
    swatch: ["#751648", "#e0218a", "#fff6fa"],
  },
  DISCO: {
    id: "DISCO",
    label: "Noche de Brillos",
    tagline: "Negro, oro y magenta. Glamour de noche y destellos.",
    attribute: "disco",
    copy: {
      eyebrow: "Estás invitada",
      headline: "La noche empieza cuando llegas tú",
      cta: "Enciende las luces",
    },
    swatch: ["#0d0a16", "#c9a227", "#faf6ec"],
  },
};

/** El catálogo en el orden en que se muestra en el panel. */
export const THEME_LIST: ThemeDefinition[] = [
  THEMES.BOSQUE,
  THEMES.VAQUEROS,
  THEMES.BARBIE,
  THEMES.DISCO,
];

export function getTheme(id: EventThemeValue): ThemeDefinition {
  return THEMES[id] ?? THEMES.BOSQUE;
}

/**
 * Texto efectivo de la portada: lo que escribió el anfitrión y, donde lo dejó
 * vacío, el del tema. Cada campo cae por separado.
 */
export function resolveCopy(
  id: EventThemeValue,
  overrides: Partial<Record<keyof ThemeCopy, string | null>>
): ThemeCopy {
  const base = getTheme(id).copy;
  return {
    eyebrow: overrides.eyebrow?.trim() || base.eyebrow,
    headline: overrides.headline?.trim() || base.headline,
    cta: overrides.cta?.trim() || base.cta,
  };
}
