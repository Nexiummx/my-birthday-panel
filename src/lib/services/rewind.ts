import "server-only";
import { prisma } from "@/lib/prisma";
import { listPhotos, photoStats } from "@/lib/services/photos";
import { toPublicPhoto, type PublicPhoto } from "@/lib/public-photo";
import { selectForRewind } from "@/lib/rewind-selection";
import { formatInvitationDate } from "@/lib/utils";
import type { EventThemeValue } from "@/lib/validations";

/**
 * El recuerdo: el resumen de la fiesta contado en pantallas, estilo stories.
 *
 * Todo se arma en el servidor. El reproductor solo recorre una lista de
 * tarjetas ya resueltas, y eso tiene dos ventajas: el navegador no recibe la
 * lista de invitados ni los mensajes que no se van a mostrar, y añadir una
 * pantalla nueva es añadir un tipo aquí, sin tocar la animación.
 *
 * Las tarjetas sin datos no se generan. Un evento sin fotos no enseña "0
 * fotos": simplemente no tiene esa pantalla, y el recuerdo sigue teniendo
 * sentido.
 */

export type RewindCard =
  | { kind: "intro"; title: string; highlight: string | null; dateLabel: string }
  | { kind: "count"; eyebrow: string; value: number; unit: string; note: string | null }
  | { kind: "names"; eyebrow: string; title: string; names: string[] }
  | { kind: "message"; author: string; text: string }
  | { kind: "hero"; photo: PublicPhoto }
  | { kind: "photos"; photos: PublicPhoto[] }
  | { kind: "author"; name: string; count: number }
  | { kind: "outro"; title: string; note: string; galleryHref: string; shareHref: string; shareTitle: string };

export interface RewindDeck {
  eventName: string;
  theme: EventThemeValue;
  shareCode: string;
  cards: RewindCard[];
}

/** Cuántas fotos entran en las pantallas de fotos, y de cuántas en cuántas. */
const PHOTOS_PER_CARD = 4;
const MAX_PHOTO_CARDS = 3;
/** Mensajes de invitados que se muestran, de los más largos a los más cortos. */
const MAX_MESSAGES = 3;

/** "Maya · 29" → ["Maya", "29"], igual que en la invitación. */
function splitName(name: string): [string, string | null] {
  const [title, highlight] = name.split("·").map((part) => part.trim());
  return [title || name, highlight || null];
}

export async function buildRewind(event: {
  id: string;
  name: string;
  date: Date;
  theme: string;
  shareCode: string;
}): Promise<RewindDeck> {
  const [invitations, confirmedRsvps, guestSum, photos, stats] = await Promise.all([
    prisma.invitation.count({ where: { eventId: event.id } }),
    prisma.rsvp.findMany({
      where: { status: "CONFIRMED", invitation: { eventId: event.id } },
      select: {
        comment: true,
        guestCount: true,
        rewindOrder: true,
        invitation: { select: { guestName: true } },
      },
      orderBy: { respondedAt: "asc" },
    }),
    prisma.rsvp.aggregate({
      _sum: { guestCount: true },
      where: { status: "CONFIRMED", invitation: { eventId: event.id } },
    }),
    listPhotos(event.id),
    photoStats(event.id),
  ]);

  const people = guestSum._sum.guestCount ?? 0;
  const names = confirmedRsvps.map((rsvp) => rsvp.invitation.guestName);
  const [title, highlight] = splitName(event.name);

  const cards: RewindCard[] = [
    { kind: "intro", title, highlight, dateLabel: formatInvitationDate(event.date) },
  ];

  if (people > 0) {
    cards.push({
      kind: "count",
      eyebrow: "Se juntaron",
      value: people,
      unit: people === 1 ? "persona" : "personas",
      note: invitations > 0 ? `de ${invitations} invitaciones enviadas` : null,
    });
  }

  if (names.length > 0) {
    cards.push({
      kind: "names",
      eyebrow: "Los que no faltaron",
      title: names.length === 1 ? "Vino" : "Vinieron",
      // Un listado enorme no se lee: se corta y el resto se cuenta aparte.
      names: names.slice(0, 24),
    });
  }

  // Manda lo que eligió el anfitrión; si no eligió nada, los más largos, que
  // son los que alguien se tomó el tiempo de escribir.
  const withComment = confirmedRsvps.filter(
    (rsvp) => rsvp.comment && rsvp.comment.trim().length > 0
  );
  const messages = selectForRewind(withComment, () =>
    [...withComment]
      .filter((rsvp) => (rsvp.comment?.trim().length ?? 0) > 12)
      .sort((a, b) => (b.comment?.length ?? 0) - (a.comment?.length ?? 0))
      .slice(0, MAX_MESSAGES)
  );

  for (const message of messages) {
    cards.push({
      kind: "message",
      author: message.invitation.guestName,
      text: message.comment!.trim(),
    });
  }

  if (stats.visible > 0) {
    cards.push({
      kind: "count",
      eyebrow: "Y quedaron",
      value: stats.visible,
      unit: stats.visible === 1 ? "foto" : "fotos",
      note:
        stats.topAuthors.length > 1
          ? `subidas por ${stats.topAuthors.length} personas`
          : null,
    });

    // Las que eligió el anfitrión, en su orden; si no eligió, las más recientes.
    const elegidas = selectForRewind(photos, () =>
      photos.slice(0, PHOTOS_PER_CARD * MAX_PHOTO_CARDS + 1)
    );
    const publicPhotos = elegidas.map(toPublicPhoto);

    // Una a pantalla completa antes de las rejillas. Si el anfitrión eligió, la
    // primera de su lista es la portada: es la decisión que ya tomó. Si no, se
    // prefiere una con pie — quien se molestó en escribirlo tiene algo que contar.
    const curada = photos.some((photo) => photo.rewindOrder !== null);
    const hero = curada
      ? publicPhotos[0]
      : (publicPhotos.find((photo) => photo.caption) ?? publicPhotos[0]);

    if (hero) {
      cards.push({ kind: "hero", photo: hero });
    }

    // La portada no se repite en las rejillas.
    const resto = publicPhotos.filter((photo) => photo.id !== hero?.id);
    for (let index = 0; index < MAX_PHOTO_CARDS; index += 1) {
      const slice = resto.slice(index * PHOTOS_PER_CARD, (index + 1) * PHOTOS_PER_CARD);
      if (slice.length === 0) break;
      cards.push({ kind: "photos", photos: slice });
    }

    const [top] = stats.topAuthors;
    // Solo tiene gracia si de verdad destacó: con una sola foto de diferencia
    // no hay nada que celebrar.
    if (top && top.count >= 3) {
      cards.push({ kind: "author", name: top.name, count: top.count });
    }
  }

  cards.push({
    kind: "outro",
    title: "Hasta la próxima",
    note: stats.visible > 0 ? "Todas las fotos siguen aquí" : "Gracias por venir",
    galleryHref: `/f/${event.shareCode}`,
    shareHref: `/r/${event.shareCode}`,
    shareTitle: `El recuerdo de ${event.name}`,
  });

  return {
    eventName: event.name,
    theme: event.theme as EventThemeValue,
    shareCode: event.shareCode,
    cards,
  };
}
