import "server-only";
import { prisma } from "@/lib/prisma";
import { countByStage } from "@/lib/invite-stage";
import { percentage } from "@/lib/utils";

export interface DashboardStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  /** % de invitaciones que respondieron que sí, sobre el total. */
  confirmationRate: number;
  /** % de invitaciones que ya respondieron (sí o no). */
  responseRate: number;
  /** Suma de pases asignados. */
  totalPasses: number;
  /** Suma de personas confirmadas. */
  confirmedGuests: number;
  /** Cuántas faltan por mandar y cuántas se mandaron sin que nadie las abriera. */
  unsent: number;
  unopened: number;
  /** Personas que llegaron de verdad, si ya se pasó lista. */
  arrived: number;
}

const EMPTY: DashboardStats = {
  total: 0,
  confirmed: 0,
  pending: 0,
  declined: 0,
  confirmationRate: 0,
  responseRate: 0,
  totalPasses: 0,
  confirmedGuests: 0,
  unsent: 0,
  unopened: 0,
  arrived: 0,
};

/**
 * Métricas de un evento. Igual que en listInvitations, el filtro cruza siempre
 * por el dueño: las cifras de un evento ajeno no deben poder consultarse ni
 * agregadas.
 */
export async function getDashboardStats(
  ownerId: string,
  eventId: string | null
): Promise<DashboardStats> {
  if (!eventId) return EMPTY;

  const scope = { eventId, event: { ownerId } } as const;

  const [grouped, passes, confirmedGuests, tracking, arrived] = await Promise.all([
    prisma.invitation.groupBy({ by: ["status"], _count: { _all: true }, where: scope }),
    prisma.invitation.aggregate({ _sum: { guestCount: true }, where: scope }),
    prisma.rsvp.aggregate({
      _sum: { guestCount: true },
      where: { status: "CONFIRMED", invitation: scope },
    }),
    // Lo mínimo para clasificar cada invitación en su punto del camino, sin
    // traerse la lista entera al servidor de la portada.
    prisma.invitation.findMany({
      where: scope,
      select: { status: true, sentAt: true, firstViewedAt: true },
    }),
    prisma.invitation.aggregate({ _sum: { checkedInCount: true }, where: scope }),
  ]);

  const stages = countByStage(tracking);

  const countOf = (status: string) =>
    grouped.find((row) => row.status === status)?._count._all ?? 0;

  const confirmed = countOf("CONFIRMED");
  const pending = countOf("PENDING");
  const declined = countOf("DECLINED");
  const total = confirmed + pending + declined;

  return {
    total,
    confirmed,
    pending,
    declined,
    confirmationRate: percentage(confirmed, total),
    responseRate: percentage(confirmed + declined, total),
    totalPasses: passes._sum.guestCount ?? 0,
    confirmedGuests: confirmedGuests._sum.guestCount ?? 0,
    unsent: stages.SIN_ENVIAR,
    unopened: stages.ENVIADA,
    arrived: arrived._sum.checkedInCount ?? 0,
  };
}
