import { describe, expect, it } from "vitest";
import { EVENT_THEMES } from "@/lib/validations";
import { getTheme, resolveCopy, THEME_LIST, THEMES } from "@/lib/themes";

describe("catálogo de temas", () => {
  it("el registro cubre todos los temas del enum", () => {
    // Si se agrega un tema a la base y no aquí, la invitación se renderizaría
    // con la estética equivocada en vez de fallar.
    for (const id of EVENT_THEMES) {
      expect(THEMES[id]).toBeDefined();
      expect(THEMES[id].id).toBe(id);
    }
    expect(THEME_LIST).toHaveLength(EVENT_THEMES.length);
  });

  it("cada tema trae sus tres colores de muestra y sus textos", () => {
    for (const theme of THEME_LIST) {
      expect(theme.swatch).toHaveLength(3);
      for (const color of theme.swatch) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(theme.copy.eyebrow.length).toBeGreaterThan(0);
      expect(theme.copy.headline.length).toBeGreaterThan(0);
      expect(theme.copy.cta.length).toBeGreaterThan(0);
    }
  });

  it("los atributos data-theme no se repiten", () => {
    const attributes = THEME_LIST.map((theme) => theme.attribute);
    expect(new Set(attributes).size).toBe(attributes.length);
  });

  it("un tema desconocido cae en Bosque en vez de romper", () => {
    // @ts-expect-error se comprueba a propósito el valor fuera del tipo
    expect(getTheme("NO_EXISTE").id).toBe("BOSQUE");
  });
});

describe("resolveCopy", () => {
  it("usa el texto del tema cuando no hay nada escrito", () => {
    expect(resolveCopy("DISCO", {})).toEqual(THEMES.DISCO.copy);
  });

  it("cada campo cae por separado", () => {
    const copy = resolveCopy("BARBIE", { headline: "Mi titular" });
    expect(copy.headline).toBe("Mi titular");
    expect(copy.eyebrow).toBe(THEMES.BARBIE.copy.eyebrow);
  });

  it("el texto en blanco cuenta como vacío, no como texto", () => {
    const copy = resolveCopy("VAQUEROS", { cta: "   ", eyebrow: null });
    expect(copy.cta).toBe(THEMES.VAQUEROS.copy.cta);
    expect(copy.eyebrow).toBe(THEMES.VAQUEROS.copy.eyebrow);
  });
});
