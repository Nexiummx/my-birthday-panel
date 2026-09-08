import { describe, expect, it } from "vitest";
import { PLANS, contactHref, formatPrice, planForQuota } from "@/lib/pricing";

describe("catálogo de planes", () => {
  it("los cupos van de menor a mayor y no se repiten", () => {
    // planForQuota busca el primer plan que alcance el cupo: si el orden se
    // rompe, un cliente con cupo 5 vería el nombre del plan de un evento.
    const quotas = PLANS.map((plan) => plan.quota);
    expect(quotas).toEqual([...quotas].sort((a, b) => a - b));
    expect(new Set(quotas).size).toBe(quotas.length);
  });

  it("destaca exactamente un plan", () => {
    expect(PLANS.filter((plan) => plan.featured)).toHaveLength(1);
  });

  it("todo plan tiene precio, cupo y al menos una característica", () => {
    for (const plan of PLANS) {
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.quota).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

describe("planForQuota", () => {
  it("cupo 0 no es un plan: es una cuenta sin activar", () => {
    expect(planForQuota(0)).toBeNull();
    expect(planForQuota(-1)).toBeNull();
  });

  it("cada cupo del catálogo se nombra a sí mismo", () => {
    for (const plan of PLANS) {
      expect(planForQuota(plan.quota)?.id).toBe(plan.id);
    }
  });

  it("un cupo por encima del catálogo cae en el plan más grande", () => {
    const biggest = PLANS[PLANS.length - 1];
    expect(planForQuota(biggest.quota + 50)?.id).toBe(biggest.id);
  });
});

describe("formatPrice", () => {
  it("agrupa los miles sin depender de la localización", () => {
    // A propósito no usa Intl: el servidor y el navegador pueden traer datos
    // de localización distintos y una diferencia de un carácter rompe la
    // hidratación de la portada.
    expect(formatPrice(890)).toBe("$890");
    expect(formatPrice(1490)).toBe("$1,490");
    expect(formatPrice(1234567)).toBe("$1,234,567");
  });
});

describe("contactHref", () => {
  it("sin número configurado cae a un mailto", () => {
    expect(contactHref()).toMatch(/^mailto:/);
  });

  it("lleva el correo de la cuenta para que el equipo sepa a quién activar", () => {
    const href = contactHref({ plan: PLANS[0], accountEmail: "ana@cliente.mx" });
    expect(decodeURIComponent(href)).toContain("ana@cliente.mx");
    expect(decodeURIComponent(href)).toContain(PLANS[0].name);
  });
});
