/**
 * En qué punto del camino está cada invitación.
 *
 * El panel enseñaba dos cosas: cuántas confirmaron y cuántas no. Eso deja al
 * anfitrión sin saber lo único accionable: **por qué** alguien no ha
 * respondido. No es lo mismo que no le haya llegado la invitación, que la haya
 * recibido y no la abra, o que la abriera y no se decida — cada caso pide algo
 * distinto de él.
 *
 * El orden de las comprobaciones importa: una respuesta manda sobre cualquier
 * otra señal, porque alguien puede confirmar por WhatsApp y que el anfitrión lo
 * marque a mano sin que la invitación se haya abierto nunca.
 */

export const INVITE_STAGES = [
  "SIN_ENVIAR",
  "ENVIADA",
  "ABIERTA",
  "CONFIRMADA",
  "DECLINADA",
] as const;
export type InviteStage = (typeof INVITE_STAGES)[number];

export const STAGE_LABELS: Record<InviteStage, string> = {
  SIN_ENVIAR: "Sin enviar",
  ENVIADA: "Enviada, sin abrir",
  ABIERTA: "Abierta, sin responder",
  CONFIRMADA: "Confirmada",
  DECLINADA: "No asistirá",
};

/** Qué le toca hacer al anfitrión en cada punto. */
export const STAGE_ACTIONS: Record<InviteStage, string> = {
  SIN_ENVIAR: "Mándala",
  ENVIADA: "Puede que no le llegara: reenvíala",
  ABIERTA: "La vio y no respondió: un recordatorio",
  CONFIRMADA: "Nada, ya está",
  DECLINADA: "Nada",
};

export interface Trackable {
  status: string;
  sentAt: Date | string | null;
  firstViewedAt: Date | string | null;
}

export function stageOf(invitation: Trackable): InviteStage {
  // Una respuesta gana siempre: el anfitrión puede haberla marcado a mano
  // porque se lo dijeron por teléfono, sin que nadie abriera nada.
  if (invitation.status === "CONFIRMED") return "CONFIRMADA";
  if (invitation.status === "DECLINED") return "DECLINADA";
  if (invitation.firstViewedAt) return "ABIERTA";
  if (invitation.sentAt) return "ENVIADA";
  return "SIN_ENVIAR";
}

/** Cuántas hay en cada punto. Alimenta el embudo de la pantalla de envío. */
export function countByStage(invitations: Trackable[]): Record<InviteStage, number> {
  const counts = Object.fromEntries(INVITE_STAGES.map((stage) => [stage, 0])) as Record<
    InviteStage,
    number
  >;
  for (const invitation of invitations) {
    counts[stageOf(invitation)] += 1;
  }
  return counts;
}

/**
 * Las que piden acción, en el orden en que conviene atacarlas: primero las que
 * no han salido, después las que puede que no llegaran, y al final las que solo
 * necesitan un empujón.
 */
export const PENDING_STAGES: InviteStage[] = ["SIN_ENVIAR", "ENVIADA", "ABIERTA"];

export function needsAction(invitation: Trackable): boolean {
  return PENDING_STAGES.includes(stageOf(invitation));
}
