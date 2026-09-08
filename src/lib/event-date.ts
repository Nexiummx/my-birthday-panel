import { formatLongDate } from "@/lib/utils";

/**
 * La regla de la fecha del evento.
 *
 * Un crédito compra *un* evento, pero sin esta regla el crédito no vale nada:
 * bastaba con editar la fiesta del año pasado —otro nombre, otra fecha, lista
 * de invitados nueva— para estrenar evento sin pagar. Ningún contador se entera
 * de eso, porque no se crea nada.
 *
 * Así que la fecha queda anclada a la que tuvo el evento al nacer
 * (`originalDate`) y solo se puede mover:
 *
 *   1. una vez, y
 *   2. dentro del mes anterior o el siguiente al original.
 *
 * Eso cubre lo que de verdad le pasa a la gente —el salón cambió el fin de
 * semana, la fecha se recorrió dos semanas— y deja fuera el salto de un año.
 * Cualquier otro movimiento es legítimo pero excepcional, y para eso está el
 * ticket: lo mueve el equipo a mano.
 *
 * Todo se calcula en UTC. Las fechas entran como "YYYY-MM-DD" desde
 * <input type="date"> y se guardan a medianoche UTC; usar la zona horaria local
 * movería de mes a un evento del día 1 o del 31.
 */

/** Meses de margen a cada lado de la fecha original. */
export const MONTH_WINDOW = 1;

/** Año y mes como un solo número, para poder restarlos. */
function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

/** ¿Las dos fechas son el mismo día? Un "cambio" a la misma fecha no lo es. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/** ¿La fecha nueva cae dentro de la ventana permitida? */
export function isWithinWindow(next: Date, original: Date): boolean {
  return Math.abs(monthIndex(next) - monthIndex(original)) <= MONTH_WINDOW;
}

/**
 * Primer y último día permitidos. Los consume el <input type="date"> como min y
 * max, para que el calendario ya no ofrezca lo que el servidor va a rechazar.
 */
export function dateWindow(original: Date): { from: Date; to: Date } {
  const year = original.getUTCFullYear();
  const month = original.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month - MONTH_WINDOW, 1)),
    // Día 0 del mes siguiente al último permitido = último día de ese mes.
    to: new Date(Date.UTC(year, month + MONTH_WINDOW + 1, 0)),
  };
}

/** "YYYY-MM-DD", que es el formato que entiende <input type="date">. */
export function toDateInput(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** La ventana en palabras, para explicarla en el formulario y en el error. */
export function describeWindow(original: Date): string {
  const { from, to } = dateWindow(original);
  return `entre el ${formatLongDate(from)} y el ${formatLongDate(to)}`;
}

/** Qué se puede hacer hoy con la fecha de un evento. */
export interface DatePolicy {
  /** false cuando el cambio ya se usó. */
  canChange: boolean;
  window: { from: string; to: string };
  /** La ventana en palabras. */
  description: string;
}

export function datePolicy(event: {
  originalDate: Date | string;
  dateChangedAt: Date | string | null;
}): DatePolicy {
  const original = new Date(event.originalDate);
  const { from, to } = dateWindow(original);
  return {
    canChange: event.dateChangedAt === null,
    window: { from: toDateInput(from), to: toDateInput(to) },
    description: describeWindow(original),
  };
}
