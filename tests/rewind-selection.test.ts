import { describe, expect, it } from "vitest";
import { curatedSelection, positionsFor, selectForRewind } from "@/lib/rewind-selection";

const foto = (id: string, rewindOrder: number | null) => ({ id, rewindOrder });

describe("curatedSelection", () => {
  it("sin nadie elegido devuelve null, no una lista vacía", () => {
    // La diferencia importa: null significa "decide tú", y una lista vacía
    // significaría "el anfitrión no quiere nada", que dejaría el recuerdo mudo.
    expect(curatedSelection([foto("a", null), foto("b", null)])).toBeNull();
    expect(curatedSelection([])).toBeNull();
  });

  it("devuelve solo las elegidas, en su orden", () => {
    const items = [foto("a", null), foto("b", 2), foto("c", null), foto("d", 1)];
    expect(curatedSelection(items)?.map((i) => i.id)).toEqual(["d", "b"]);
  });

  it("con posiciones repetidas mantiene el orden de llegada", () => {
    // Un guardado a medias no puede barajar la lista al azar.
    const items = [foto("a", 1), foto("b", 1), foto("c", 1)];
    expect(curatedSelection(items)?.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("no altera la lista original", () => {
    const items = [foto("a", 3), foto("b", 1)];
    curatedSelection(items);
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("selectForRewind", () => {
  it("usa la automática solo cuando nadie eligió", () => {
    const items = [foto("a", null), foto("b", null)];
    expect(selectForRewind(items, () => [items[1]]).map((i) => i.id)).toEqual(["b"]);
  });

  it("la selección del anfitrión gana sobre la automática", () => {
    const items = [foto("a", 1), foto("b", null)];
    expect(selectForRewind(items, () => [items[1]]).map((i) => i.id)).toEqual(["a"]);
  });

  it("no calcula la automática si no hace falta", () => {
    // Importa: la automática ordena y recorta listas que pueden ser largas.
    let veces = 0;
    selectForRewind([foto("a", 1)], () => {
      veces += 1;
      return [];
    });
    expect(veces).toBe(0);
  });
});

describe("positionsFor", () => {
  it("numera desde 1 y sin huecos", () => {
    // Se guardan compactas para que el número que ve el anfitrión sea el que
    // hay en la base, sin importar cuántas veces haya editado.
    expect([...positionsFor(["x", "y", "z"])]).toEqual([
      ["x", 1],
      ["y", 2],
      ["z", 3],
    ]);
    expect(positionsFor([]).size).toBe(0);
  });
});
