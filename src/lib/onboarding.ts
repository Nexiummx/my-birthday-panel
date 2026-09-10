/**
 * En qué punto está una cuenta recién creada.
 *
 * Quien se registra hoy aterriza en un panel con cuatro contadores a cero y un
 * menú de diez pantallas que no puede usar. Peor: todas le dicen "crea tu
 * evento", y al llegar ahí se encuentra con que primero hay que activar el
 * plan. Tres clics para descubrir un muro.
 *
 * El progreso se DEDUCE de los datos, no se guarda en ninguna parte. Es el
 * mismo criterio que en lib/invite-stage.ts, y por las mismas razones: una
 * marca guardada se desincroniza —el anfitrión borra sus invitaciones y el
 * paso sigue en verde—, no viaja entre dispositivos y hay que migrarla. Un
 * cálculo sobre lo que hay siempre dice la verdad.
 *
 * Cuatro pasos y no seis. Se quedaron fuera dos que parecían obvios:
 *
 *   "Personaliza la invitación" no tiene señal honesta. Quien quiera el tema
 *   de fábrica sin texto propio nunca lo completaría, y una casilla que no se
 *   puede marcar es peor que no tenerla.
 *
 *   "Recibe la primera respuesta" no es una tarea: no hay nada que hacer. Una
 *   lista de tareas donde una no se puede hacer enseña a ignorar la lista.
 */

export const ONBOARDING_STEPS = ["PLAN", "EVENTO", "LISTA", "ENVIO"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingInput {
  /** Créditos comprados en total. 0 = cuenta recién registrada. */
  quotaLimit: number;
  /** ¿Ya existe un evento? */
  hasEvent: boolean;
  /** Invitaciones dadas de alta. */
  invitations: number;
  /** Invitaciones marcadas como enviadas. */
  sent: number;
}

export interface OnboardingTask {
  step: OnboardingStep;
  title: string;
  /** Por qué importa, en una línea. Sin esto una lista de tareas es una orden. */
  why: string;
  done: boolean;
  /** El primero sin terminar: el único que lleva llamada a la acción. */
  current: boolean;
  /**
   * No se puede hacer todavía porque falta el anterior. Un paso bloqueado NO
   * enseña botón: mandar a alguien a una pantalla que le va a decir que no es
   * exactamente el problema que esto viene a arreglar.
   */
  blocked: boolean;
  href: string;
  cta: string;
}

const PASOS: Record<
  OnboardingStep,
  { title: string; why: string; href: string; cta: string }
> = {
  PLAN: {
    title: "Activa tu plan",
    why: "Cada evento consume un crédito. Es el único paso que no depende de ti: escríbenos y lo activamos.",
    href: "/admin/pago",
    cta: "Ver planes",
  },
  EVENTO: {
    title: "Crea tu evento",
    why: "La fecha, el lugar y el tema que van a ver tus invitados al abrir su invitación.",
    href: "/admin/evento",
    cta: "Crear evento",
  },
  LISTA: {
    title: "Arma tu lista",
    why: "Cada invitado recibe un enlace propio, con su nombre. Puedes pegarlos de golpe desde una hoja de cálculo.",
    href: "/admin/invitaciones",
    cta: "Añadir invitados",
  },
  ENVIO: {
    title: "Manda la primera invitación",
    why: "Se abre WhatsApp con el mensaje ya escrito y su enlace. Tú solo le das a enviar.",
    href: "/admin/envio",
    cta: "Ir a envío",
  },
};

export interface OnboardingProgress {
  tasks: OnboardingTask[];
  /** Pasos terminados. */
  done: number;
  total: number;
  /** ¿Ya está todo? Entonces el panel deja de enseñar la guía. */
  complete: boolean;
  /** El paso en el que está, o null si terminó. */
  current: OnboardingStep | null;
}

export function onboardingProgress(input: OnboardingInput): OnboardingProgress {
  // El orden es de dependencia real, no de preferencia: sin plan no hay
  // evento, sin evento no hay a quién invitar, sin lista no hay qué mandar.
  const hecho: Record<OnboardingStep, boolean> = {
    PLAN: input.quotaLimit > 0,
    EVENTO: input.hasEvent,
    LISTA: input.invitations > 0,
    ENVIO: input.sent > 0,
  };

  const current = ONBOARDING_STEPS.find((step) => !hecho[step]) ?? null;

  const tasks = ONBOARDING_STEPS.map<OnboardingTask>((step) => ({
    step,
    ...PASOS[step],
    done: hecho[step],
    current: step === current,
    // Bloqueado = le falta algo de más arriba. Se calcula por posición y no a
    // mano para que añadir un paso en medio no obligue a revisar el resto.
    blocked: !hecho[step] && step !== current,
  }));

  const done = ONBOARDING_STEPS.filter((step) => hecho[step]).length;

  return { tasks, done, total: ONBOARDING_STEPS.length, complete: current === null, current };
}
