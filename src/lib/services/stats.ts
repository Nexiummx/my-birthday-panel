import "server-only";
import { prisma } from "@/lib/prisma";
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

  const [grouped, passes, confirmedGuests] = await Promise.all([
    prisma.invitation.groupBy({ by: ["status"], _count: { _all: true }, where: scope }),
    prisma.invitation.aggregate({ _sum: { guestCount: true }, where: scope }),
    prisma.rsvp.aggregate({
      _sum: { guestCount: true },
      where: { status: "CONFIRMED", invitation: scope },
    }),
  ]);

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
  };
}
