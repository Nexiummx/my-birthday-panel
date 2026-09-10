import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptNullable } from "@/lib/crypto/field-crypto";
import { listPhotos, photoStats } from "@/lib/services/photos";
import { photoUrl } from "@/lib/services/photos";
import { selectForRewind } from "@/lib/rewind-selection";
import type { RecapScene } from "@/lib/recap-film";
import { getTheme } from "@/lib/themes";
import type { RecapPalette } from "@/lib/recap-render";
import { formatInvitationDate } from "@/lib/utils";
import type { EventThemeValue } from "@/lib/validations";

/**
 * El guion del video para redes.
 *
 * Es hermano del recuerdo (services/rewind.ts) pero no el mismo, y la
 * diferencia no es el formato: es para quién es cada uno.
 *
 *   El recuerdo  lo abre un invitado que estuvo en la fiesta. Puede durar dos
 *                minutos, tener veinte pantallas y nombrar a todo el mundo,
 *                porque quien lo ve se está buscando en él.
 *   Este video   se publica. Lo va a ver gente que no fue, mientras baja por su
 *                muro, en tres segundos y probablemente sin sonido. Así que son
 *                pocos planos, cifras grandes y las mejores fotos.
 *
 * De ahí que la lista de nombres no esté aquí, ni el "fotógrafo de la noche":
 * fuera de la fiesta no significan nada.
 */

export interface RecapReel {
  eventName: string;
  theme: EventThemeValue;
  palette: RecapPalette;
  scenes: RecapScene[];
  /** Para poder avisar de por qué el guion salió corto. */
  photoCount: number;
}

/** Cuántas fotos entran. Más allá de esto el video se hace largo de generar. */
const HERO_PHOTOS = 1;
const COLLAGE_SIZE = 4;
const MAX_COLLAGES = 2;
const MAX_QUOTES = 2;

/** "Maya · 29" → ["Maya", "29"], igual que en la invitación. */
function splitName(name: string): [string, string | null] {
  const [title, highlight] = name.split("·").map((part) => part.trim());
  return [title || name, highlight || null];
}

export async function buildRecap(event: {
  id: string;
  name: string;
  date: Date;
  theme: string;
}): Promise<RecapReel> {
  const [rawRsvps, guestSum, photos, stats] = await Promise.all([
    prisma.rsvp.findMany({
      where: { status: "CONFIRMED", invitation: { eventId: event.id } },
      select: {
        comment: true,
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

  // Los mensajes vienen cifrados de la base: se abren aquí, una vez, antes de
  // que nadie los ordene por longitud o los recorte.
  const confirmedRsvps = rawRsvps.map((rsvp) => ({
    ...rsvp,
    comment: decryptNullable(rsvp.comment),
  }));

  const people = guestSum._sum.guestCount ?? 0;
  const [title, highlight] = splitName(event.name);

  // Se respeta lo que el anfitrión eligió para el recuerdo. Tener dos
  // selecciones distintas para las mismas fotos sería pedirle que haga el
  // trabajo dos veces.
  const chosen = selectForRewind(photos, () => photos);
  const urls = chosen.map((photo) => photoUrl(photo.storagePath));

  const withComment = confirmedRsvps.filter((rsvp) => (rsvp.comment ?? "").trim().length > 12);
  const quotes = selectForRewind(withComment, () =>
    [...withComment].sort((a, b) => (b.comment?.length ?? 0) - (a.comment?.length ?? 0))
  ).slice(0, MAX_QUOTES);

  const scenes: RecapScene[] = [
    { kind: "title", title, highlight, dateLabel: formatInvitationDate(event.date) },
  ];

  if (people > 0) {
    scenes.push({
      kind: "stat",
      eyebrow: "Se juntaron",
      value: people,
      unit: people === 1 ? "persona" : "personas",
    });
  }

  const hero = chosen[0];
  if (hero) {
    scenes.push({
      kind: "photo",
      url: photoUrl(hero.storagePath),
      caption: hero.caption,
      author: hero.authorName,
    });
  }

  if (quotes[0]) {
    scenes.push({
      kind: "quote",
      text: quotes[0].comment!.trim(),
      author: quotes[0].invitation.guestName,
    });
  }

  // Se alternan collages y planos sueltos: dos rejillas seguidas se leen como
  // una sola y el video pierde el pulso.
  const rest = urls.slice(HERO_PHOTOS);
  for (let index = 0; index < MAX_COLLAGES; index += 1) {
    const slice = rest.slice(index * COLLAGE_SIZE, (index + 1) * COLLAGE_SIZE);
    if (slice.length === 0) break;
    scenes.push({ kind: "collage", urls: slice });

    if (index === 0 && stats.visible > 0) {
      scenes.push({
        kind: "stat",
        eyebrow: "Quedaron",
        value: stats.visible,
        unit: stats.visible === 1 ? "foto" : "fotos",
      });
    }
  }

  if (quotes[1]) {
    scenes.push({
      kind: "quote",
      text: quotes[1].comment!.trim(),
      author: quotes[1].invitation.guestName,
    });
  }

  scenes.push({ kind: "end", title: "Gracias por venir", note: event.name });

  return {
    eventName: event.name,
    theme: event.theme as EventThemeValue,
    palette: getTheme(event.theme as EventThemeValue).reel,
    scenes,
    photoCount: stats.visible,
  };
}
