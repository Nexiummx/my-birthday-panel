import { describe, expect, it } from "vitest";
import { SHARE_CODE_LENGTH, isShareCode, newShareCode } from "@/lib/share-code";

describe("newShareCode", () => {
  it("tiene la longitud acordada y solo símbolos del alfabeto", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = newShareCode();
      expect(code).toHaveLength(SHARE_CODE_LENGTH);
      expect(isShareCode(code)).toBe(true);
    }
  });

  it("no usa 0, 1, l ni o", () => {
    // El código se imprime en las mesas y se dicta por teléfono: esos cuatro
    // se confunden entre sí en casi cualquier tipografía.
    const muestra = Array.from({ length: 300 }, () => newShareCode()).join("");
    for (const caracter of ["0", "1", "l", "o"]) {
      expect(muestra).not.toContain(caracter);
    }
  });

  it("no repite", () => {
    const codigos = new Set(Array.from({ length: 500 }, () => newShareCode()));
    expect(codigos.size).toBe(500);
  });

  it("reparte los símbolos sin favorecer a ninguno", () => {
    // El alfabeto tiene 32 símbolos y 256 es múltiplo de 32, así que el resto
    // no sesga. Si alguien cambia el alfabeto a un tamaño que no divida a 256,
    // esta prueba lo detecta.
    const total = 32 * 400;
    const cuenta = new Map<string, number>();
    for (const caracter of Array.from({ length: 400 }, () => newShareCode(32)).join("")) {
      cuenta.set(caracter, (cuenta.get(caracter) ?? 0) + 1);
    }
    expect(cuenta.size).toBe(32);
    const esperado = total / 32;
    for (const veces of cuenta.values()) {
      expect(veces).toBeGreaterThan(esperado * 0.7);
      expect(veces).toBeLessThan(esperado * 1.3);
    }
  });
});

describe("isShareCode", () => {
  it("rechaza lo que llega por la URL y no tiene forma de código", () => {
    expect(isShareCode("")).toBe(false);
    expect(isShareCode("corto")).toBe(false);
    expect(isShareCode("a".repeat(SHARE_CODE_LENGTH + 1))).toBe(false);
    // Los símbolos excluidos tampoco valen aunque la longitud cuadre.
    expect(isShareCode("0123456789")).toBe(false);
    expect(isShareCode("ABCDEFGHIJ")).toBe(false);
    expect(isShareCode("../../etc/")).toBe(false);
  });
});
