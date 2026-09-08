import { describe, expect, it } from "vitest";
import { parseGuestList } from "@/lib/validations";

/**
 * La importación en bloque es la vía por la que entra la lista completa de
 * invitados, así que interpretar mal una línea significa una invitación mal
 * creada o un invitado que se pierde en silencio.
 */
describe("parseGuestList", () => {
  it("acepta nombre y pases separados por coma", () => {
    expect(parseGuestList("Mariana López, 2")).toEqual([
      { guestName: "Mariana López", guestCount: 2 },
    ]);
  });

  it("asume un pase cuando no se indica número", () => {
    expect(parseGuestList("Sofía García")).toEqual([
      { guestName: "Sofía García", guestCount: 1 },
    ]);
  });

  it("acepta tabulador, que es lo que sale al pegar de una hoja de cálculo", () => {
    expect(parseGuestList("Ana Martínez\t4")).toEqual([
      { guestName: "Ana Martínez", guestCount: 4 },
    ]);
  });

  it("acepta punto y coma", () => {
    expect(parseGuestList("Luis Pérez; 3")).toEqual([
      { guestName: "Luis Pérez", guestCount: 3 },
    ]);
  });

  it("ignora líneas vacías y espacios sobrantes", () => {
    const rows = parseGuestList("  Ana, 1  \n\n\n   \n  Luis, 2 ");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ guestName: "Ana", guestCount: 1 });
  });

  it("marca la fila en vez de descartarla cuando los pases no son válidos", () => {
    const [row] = parseGuestList("Ana Martínez, muchos");
    expect(row.guestName).toBe("Ana Martínez");
    expect(row.error).toBeDefined();
  });

  it("rechaza pases fuera de rango", () => {
    expect(parseGuestList("Ana, 0")[0].error).toBeDefined();
    expect(parseGuestList("Ana, 21")[0].error).toBeDefined();
    expect(parseGuestList("Ana, 2.5")[0].error).toBeDefined();
  });

  it("marca los nombres demasiado cortos", () => {
    expect(parseGuestList("A, 2")[0].error).toBe("Nombre demasiado corto");
  });

  it("conserva el orden de la lista", () => {
    const rows = parseGuestList("Primero\nSegundo\nTercero");
    expect(rows.map((row) => row.guestName)).toEqual(["Primero", "Segundo", "Tercero"]);
  });
});
