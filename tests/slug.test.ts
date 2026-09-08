import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * El slug ES el secreto de una invitación y además su URL pública, así que dos
 * invitados nunca pueden acabar compartiéndolo.
 */
describe("slugify", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(slugify("Mariana López")).toBe("mariana-lopez");
  });

  it("colapsa la puntuación en guiones simples", () => {
    expect(slugify("José  Ramón, Jr.")).toBe("jose-ramon-jr");
  });

  it("no deja guiones en los extremos", () => {
    expect(slugify("  ¡Ana!  ")).toBe("ana");
  });

  it("recorta a 60 caracteres", () => {
    expect(slugify("a".repeat(200))).toHaveLength(60);
  });
});

describe("uniqueSlug", () => {
  it("devuelve el slug limpio si está libre", () => {
    expect(uniqueSlug("Ana García", [])).toBe("ana-garcia");
  });

  it("añade sufijo cuando ya está ocupado", () => {
    expect(uniqueSlug("Ana García", ["ana-garcia"])).toBe("ana-garcia-2");
    expect(uniqueSlug("Ana García", ["ana-garcia", "ana-garcia-2"])).toBe("ana-garcia-3");
  });

  it("cae en un slug utilizable si el nombre no deja letras", () => {
    expect(uniqueSlug("¿¡!?", [])).toBe("invitado");
  });

  it("no repite dentro de un mismo lote", () => {
    // Es el caso de la importación: los slugs se acumulan sobre la marcha.
    const taken = new Set<string>();
    const slugs = ["Ana García", "Ana García", "Ana García"].map((name) => {
      const slug = uniqueSlug(name, taken);
      taken.add(slug);
      return slug;
    });

    expect(new Set(slugs).size).toBe(3);
    expect(slugs).toEqual(["ana-garcia", "ana-garcia-2", "ana-garcia-3"]);
  });
});
