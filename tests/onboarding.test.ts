import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, onboardingProgress } from "@/lib/onboarding";

const cuenta = {
  reciennacida: { quotaLimit: 0, hasEvent: false, invitations: 0, sent: 0 },
  conPlan: { quotaLimit: 1, hasEvent: false, invitations: 0, sent: 0 },
  conEvento: { quotaLimit: 1, hasEvent: true, invitations: 0, sent: 0 },
  conLista: { quotaLimit: 1, hasEvent: true, invitations: 12, sent: 0 },
  enMarcha: { quotaLimit: 1, hasEvent: true, invitations: 12, sent: 3 },
};

describe("onboardingProgress", () => {
  it("una cuenta recién registrada empieza por activar el plan", () => {
    const p = onboardingProgress(cuenta.reciennacida);
    expect(p.current).toBe("PLAN");
    expect(p.done).toBe(0);
    expect(p.complete).toBe(false);
  });

  it("avanza conforme la cuenta avanza", () => {
    expect(onboardingProgress(cuenta.conPlan).current).toBe("EVENTO");
    expect(onboardingProgress(cuenta.conEvento).current).toBe("LISTA");
    expect(onboardingProgress(cuenta.conLista).current).toBe("ENVIO");
  });

  it("termina cuando sale la primera invitación", () => {
    const p = onboardingProgress(cuenta.enMarcha);
    expect(p.complete).toBe(true);
    expect(p.current).toBeNull();
    expect(p.done).toBe(p.total);
  });

  it("NO enseña botón en los pasos que todavía no se pueden hacer", () => {
    // Este es EL caso. Antes, una cuenta sin créditos leía "crea tu evento" en
    // todas las pantallas, iba, y se encontraba con que primero hay que pagar.
    const p = onboardingProgress(cuenta.reciennacida);
    const evento = p.tasks.find((t) => t.step === "EVENTO")!;
    expect(evento.blocked).toBe(true);
    expect(evento.current).toBe(false);
  });

  it("solo hay un paso actual, y es el primero sin terminar", () => {
    for (const entrada of Object.values(cuenta)) {
      const actuales = onboardingProgress(entrada).tasks.filter((t) => t.current);
      expect(actuales.length).toBeLessThanOrEqual(1);
    }
  });

  it("ni bloqueado ni actual si ya está hecho", () => {
    const p = onboardingProgress(cuenta.conLista);
    for (const tarea of p.tasks.filter((t) => t.done)) {
      expect(tarea.blocked).toBe(false);
      expect(tarea.current).toBe(false);
    }
  });

  it("se deduce de los datos: quitar invitados retrocede el progreso", () => {
    // Una marca guardada se habría quedado en verde para siempre.
    const antes = onboardingProgress(cuenta.conLista);
    const despues = onboardingProgress({ ...cuenta.conLista, invitations: 0 });
    expect(antes.current).toBe("ENVIO");
    expect(despues.current).toBe("LISTA");
  });

  it("todos los pasos dicen por qué importan, no solo qué hacer", () => {
    const p = onboardingProgress(cuenta.reciennacida);
    expect(p.tasks).toHaveLength(ONBOARDING_STEPS.length);
    for (const tarea of p.tasks) {
      expect(tarea.why.length).toBeGreaterThan(30);
      expect(tarea.title.length).toBeGreaterThan(3);
    }
  });
});
