import { describe, expect, it } from "vitest";
import {
  dateWindow,
  datePolicy,
  describeWindow,
  isSameDay,
  isWithinWindow,
  toDateInput,
} from "@/lib/event-date";

/** Las fechas se guardan a medianoche UTC, igual que las manda el formulario. */
const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("isWithinWindow", () => {
  const original = at("2026-09-26");

  it("acepta el mismo mes, el anterior y el siguiente", () => {
    expect(isWithinWindow(at("2026-09-01"), original)).toBe(true);
    expect(isWithinWindow(at("2026-08-31"), original)).toBe(true);
    expect(isWithinWindow(at("2026-10-01"), original)).toBe(true);
  });

  it("rechaza dos meses hacia cualquier lado", () => {
    expect(isWithinWindow(at("2026-07-31"), original)).toBe(false);
    expect(isWithinWindow(at("2026-11-01"), original)).toBe(false);
  });

  it("rechaza el salto de un año, que es el caso que existe para cerrar", () => {
    expect(isWithinWindow(at("2027-09-26"), original)).toBe(false);
    // Y también el mismo mes del año anterior: reciclar hacia atrás es igual.
    expect(isWithinWindow(at("2025-09-26"), original)).toBe(false);
  });

  it("cruza el fin de año sin contar mal los meses", () => {
    // 12 → 1 son meses consecutivos aunque el número baje.
    expect(isWithinWindow(at("2027-01-15"), at("2026-12-20"))).toBe(true);
    expect(isWithinWindow(at("2026-11-15"), at("2026-12-20"))).toBe(true);
    expect(isWithinWindow(at("2027-02-15"), at("2026-12-20"))).toBe(false);
  });
});

describe("dateWindow", () => {
  it("va del primer día del mes anterior al último del siguiente", () => {
    const { from, to } = dateWindow(at("2026-09-26"));
    expect(toDateInput(from)).toBe("2026-08-01");
    expect(toDateInput(to)).toBe("2026-10-31");
  });

  it("resuelve el último día de febrero, bisiesto incluido", () => {
    expect(toDateInput(dateWindow(at("2028-01-10")).to)).toBe("2028-02-29");
    expect(toDateInput(dateWindow(at("2027-01-10")).to)).toBe("2027-02-28");
  });

  it("cruza el año por los dos lados", () => {
    const { from, to } = dateWindow(at("2026-01-05"));
    expect(toDateInput(from)).toBe("2025-12-01");
    expect(toDateInput(to)).toBe("2026-02-28");
  });

  it("todo lo que cae en la ventana pasa la comprobación", () => {
    const original = at("2026-09-26");
    const { from, to } = dateWindow(original);
    expect(isWithinWindow(from, original)).toBe(true);
    expect(isWithinWindow(to, original)).toBe(true);
  });
});

describe("isSameDay", () => {
  it("no cuenta como cambio guardar la misma fecha", () => {
    // El formulario reenvía la fecha en cada guardado: si esto fallara,
    // corregir una falta de ortografía consumiría el cambio de fecha.
    expect(isSameDay(at("2026-09-26"), at("2026-09-26"))).toBe(true);
    expect(isSameDay(at("2026-09-26"), at("2026-09-27"))).toBe(false);
  });
});

describe("datePolicy", () => {
  it("el cambio está disponible mientras no se haya usado", () => {
    const policy = datePolicy({ originalDate: at("2026-09-26"), dateChangedAt: null });
    expect(policy.canChange).toBe(true);
    expect(policy.window).toEqual({ from: "2026-08-01", to: "2026-10-31" });
  });

  it("una vez usado no vuelve", () => {
    const policy = datePolicy({
      originalDate: at("2026-09-26"),
      dateChangedAt: at("2026-07-01"),
    });
    expect(policy.canChange).toBe(false);
  });

  it("describe la ventana en español, para poder mostrarla", () => {
    expect(describeWindow(at("2026-09-26"))).toContain("agosto");
    expect(describeWindow(at("2026-09-26"))).toContain("octubre");
  });
});
