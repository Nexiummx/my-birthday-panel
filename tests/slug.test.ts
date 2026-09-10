import { describe, expect, it } from "vitest";
import {
  SLUG_TOKEN_LENGTH,
  eventSlug,
  hasRandomToken,
  isEventSlug,
  slugify,
  uniqueSlug,
} from "@/lib/slug";

/**
 * El slug ES el secreto de una invitación y además su URL pública. Dos
 * invitados nunca pueden compartirlo, y —lo que más importa— **no puede
 * adivinarse**: con quien tenga el enlace se puede leer el mensaje personal de
 * esa persona y sobrescribir su respuesta.
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
  it("conserva el nombre legible al principio", () => {
    // El nombre en la URL es parte de la experiencia al compartir, y no es un
    // secreto: quien recibe el enlace ya sabe cómo se llama.
    expect(uniqueSlug("Ana García", [])).toMatch(/^ana-garcia-/);
  });

  it("nunca devuelve el nombre a secas", () => {
    // Este es EL caso. "ana-garcia" a secas se adivina probando nombres
    // comunes, y con él se abre la invitación de un desconocido.
    expect(uniqueSlug("Ana García", [])).not.toBe("ana-garcia");
  });

  it("remata con suficiente azar", () => {
    const token = uniqueSlug("Ana García", []).split("-").at(-1)!;
    expect(token).toHaveLength(SLUG_TOKEN_LENGTH);
    expect(token).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyz]+$/);
  });

  it("no repite ni pidiéndolo mil veces", () => {
    const slugs = new Set(
      Array.from({ length: 1000 }, () => uniqueSlug("Ana García", []))
    );
    expect(slugs.size).toBe(1000);
  });

  it("esquiva los que ya están ocupados", () => {
    const taken = new Set<string>();
    const slugs = ["Ana García", "Ana García", "Ana García"].map((name) => {
      const slug = uniqueSlug(name, taken);
      taken.add(slug);
      return slug;
    });
    expect(new Set(slugs).size).toBe(3);
  });

  it("cae en un slug utilizable si el nombre no deja letras", () => {
    expect(uniqueSlug("¿¡!?", [])).toMatch(/^invitado-/);
  });
});

describe("eventSlug", () => {
  it("se lee: es la parte de la URL que le dice al invitado de qué fiesta es", () => {
    expect(eventSlug("XV de Sofía", [])).toBe("xv-de-sofia");
    expect(eventSlug("Maya · 29", [])).toBe("maya-29");
  });

  it("numera los repetidos en vez de sortearlos", () => {
    // Al revés que el del invitado: aquí no hay nada que proteger, así que
    // vale más un enlace legible que uno impredecible.
    expect(eventSlug("XV de Sofía", ["xv-de-sofia"])).toBe("xv-de-sofia-2");
    expect(eventSlug("XV de Sofía", ["xv-de-sofia", "xv-de-sofia-2"])).toBe("xv-de-sofia-3");
  });

  it("da algo utilizable aunque el nombre no deje letras", () => {
    expect(eventSlug("¿¡!?", [])).toBe("evento");
  });
});

describe("isEventSlug", () => {
  it("acepta lo que el anfitrión puede escribir", () => {
    expect(isEventSlug("xv-de-sofia")).toBe(true);
    expect(isEventSlug("boda2026")).toBe(true);
  });

  it("rechaza lo que partiría la ruta", () => {
    // Sin esto, un slug con barra o con espacios inventaría segmentos.
    expect(isEventSlug("xv/de/sofia")).toBe(false);
    expect(isEventSlug("xv de sofia")).toBe(false);
    expect(isEventSlug("-xv-")).toBe(false);
    expect(isEventSlug("XV")).toBe(false);
    expect(isEventSlug("xv")).toBe(false);
  });
});

describe("hasRandomToken", () => {
  it("reconoce los slugs viejos, que son los que hay que rotar", () => {
    expect(hasRandomToken("mariana-lopez")).toBe(false);
    expect(hasRandomToken("mariana-lopez-2")).toBe(false);
    expect(hasRandomToken("emiliano")).toBe(false);
  });

  it("reconoce los nuevos", () => {
    expect(hasRandomToken(uniqueSlug("Mariana López", []))).toBe(true);
  });
});
