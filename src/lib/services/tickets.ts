import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/services/errors";
import { isSuperAdmin } from "@/lib/services/accounts";
import { overrideEventDate } from "@/lib/services/events";
import { formatLongDate } from "@/lib/utils";
import { sendTicketReplyToClient, sendTicketToTeam } from "@/lib/email";
import { CONTACT } from "@/lib/pricing";
import { siteUrl } from "@/lib/utils";
import type {
  CreateTicketInput,
  TicketCategoryValue,
  TicketStatusValue,
} from "@/lib/validations";

/**
 * Tickets: el canal por el que se piden las excepciones que el panel no
 * concede solo —mover la fecha más allá de la ventana, un crédito extra—.
 *
 * Quién puede tocar qué se resuelve aquí y no en la ruta: el cliente solo llega
 * a sus tickets porque cada consulta cruza por `ownerId`, igual que el resto
 * del panel; el equipo llega a todos, pero solo después de `isSuperAdmin`.
 */

/** Correo al que llegan los avisos. Cae al de contacto comercial. */
const teamInbox = () => process.env.SUPPORT_EMAIL || CONTACT.email;

const withThread = {
  event: { select: { id: true, name: true } },
  owner: { select: { id: true, email: true, name: true } },
  messages: { orderBy: { createdAt: "asc" } },
} as const;

export type TicketRecord = Awaited<ReturnType<typeof listTickets>>[number];

/** Los tickets de un cliente. Los abiertos primero. */
export async function listTickets(ownerId: string) {
  return prisma.ticket.findMany({
    where: { ownerId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: withThread,
  });
}

/** Todos los tickets, para el equipo. */
export async function listAllTickets() {
  return prisma.ticket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: withThread,
  });
}

/**
 * Un ticket con su hilo. `actorId` acota: si no es del equipo, solo puede ser
 * suyo. Devuelve 404 y no 403 cuando no le corresponde — confirmar que el
 * ticket existe ya sería filtrar algo.
 */
async function requireTicket(id: string, actorId: string) {
  const team = await isSuperAdmin(actorId);
  const ticket = await prisma.ticket.findFirst({
    where: team ? { id } : { id, ownerId: actorId },
    include: withThread,
  });

  if (!ticket) {
    throw new ServiceError("El ticket no existe", 404);
  }
  return { ticket, team };
}

export async function createTicket(
  ownerId: string,
  authorEmail: string,
  input: CreateTicketInput
) {
  // El evento se comprueba contra la cuenta: un eventId ajeno en el cuerpo no
  // puede colgar un ticket de un evento de otro cliente.
  let eventId: string | null = null;
  if (input.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, ownerId },
      select: { id: true },
    });
    eventId = event?.id ?? null;
  }

  const ticket = await prisma.ticket.create({
    data: {
      ownerId,
      eventId,
      subject: input.subject,
      category: input.category as TicketCategoryValue,
      messages: { create: { authorEmail, body: input.body, fromTeam: false } },
    },
    include: withThread,
  });

  await sendTicketToTeam(teamInbox(), {
    subject: ticket.subject,
    from: authorEmail,
    body: input.body,
    url: `${siteUrl()}/admin/tickets`,
    isNew: true,
  });

  return ticket;
}

/**
 * Añade un mensaje al hilo. El estado lo decide quién escribe: si contesta el
 * equipo pasa a ANSWERED —le toca al cliente—, y si escribe el cliente vuelve a
 * OPEN, incluso si estaba cerrado. Un ticket cerrado al que alguien vuelve a
 * escribir está abierto, por definición.
 */
export async function replyToTicket(id: string, actorId: string, actorEmail: string, body: string) {
  const { ticket, team } = await requireTicket(id, actorId);

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: team ? "ANSWERED" : "OPEN",
      messages: { create: { authorEmail: actorEmail, body, fromTeam: team } },
    },
    include: withThread,
  });

  if (team) {
    await sendTicketReplyToClient(ticket.owner.email, {
      subject: ticket.subject,
      body,
      url: `${siteUrl()}/admin/soporte`,
    });
  } else {
    await sendTicketToTeam(teamInbox(), {
      subject: ticket.subject,
      from: actorEmail,
      body,
      url: `${siteUrl()}/admin/tickets`,
      isNew: false,
    });
  }

  return updated;
}

/** Cerrar o reabrir. Ambos lados pueden: el cliente cierra lo que ya resolvió. */
export async function setTicketStatus(id: string, actorId: string, status: TicketStatusValue) {
  const { ticket } = await requireTicket(id, actorId);
  return prisma.ticket.update({
    where: { id: ticket.id },
    data: { status },
    include: withThread,
  });
}

/**
 * Resuelve un ticket de cambio de fecha moviendo la fecha de verdad.
 *
 * Es la razón de ser de la regla estricta: si el equipo no pudiera saltársela
 * desde aquí, "abre un ticket y la movemos nosotros" sería mentira y el cliente
 * se quedaría atrapado. Solo el equipo, y solo sobre un ticket con evento.
 *
 * El movimiento se anota en el hilo: así queda por escrito quién lo pidió,
 * quién lo hizo y a qué fecha, que es lo que hace falta si alguien reclama.
 */
export async function resolveDateChange(
  id: string,
  actorId: string,
  actorEmail: string,
  date: Date
) {
  const { ticket, team } = await requireTicket(id, actorId);

  if (!team) {
    throw new ServiceError("Solo el equipo puede mover la fecha de un evento", 403);
  }
  if (!ticket.eventId) {
    throw new ServiceError("Este ticket no está asociado a ningún evento", 409);
  }

  await overrideEventDate(ticket.eventId, date);

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "ANSWERED",
      messages: {
        create: {
          authorEmail: actorEmail,
          fromTeam: true,
          body: `Movimos la fecha de “${ticket.event?.name ?? "tu evento"}” al ${formatLongDate(date)}. Tu cambio de fecha vuelve a quedar disponible desde esa fecha.`,
        },
      },
    },
    include: withThread,
  });

  await sendTicketReplyToClient(ticket.owner.email, {
    subject: ticket.subject,
    body: `Listo: la fecha quedó en ${formatLongDate(date)}.`,
    url: `${siteUrl()}/admin/soporte`,
  });

  return updated;
}

/** Cuántos tickets esperan respuesta del equipo. Alimenta el aviso del menú. */
export async function countOpenTickets() {
  return prisma.ticket.count({ where: { status: "OPEN" } });
}
