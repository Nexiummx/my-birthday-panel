/**
 * Plantilla del mensaje con el que se manda una invitación.
 *
 * El anfitrión la escribe una vez por evento y vale para toda la lista. Sin
 * esto, mandar cien invitaciones es escribir cien veces lo mismo cambiando el
 * nombre, que es justo donde la gente se equivoca y manda el enlace de Ana a
 * Beto.
 */

export const INVITE_PLACEHOLDERS = ["invitado", "evento", "fecha", "enlace"] as const;
export type InvitePlaceholder = (typeof INVITE_PLACEHOLDERS)[number];

/**
 * La de fábrica. Termina con el enlace a propósito: WhatsApp muestra la
 * previsualización del último que encuentre, y así la miniatura de la
 * invitación queda debajo del mensaje.
 */
export const DEFAULT_INVITE_MESSAGE =
  "Hola {invitado}, te esperamos en {evento} el {fecha}. Aquí está tu invitación, ábrela y confirma tu asistencia: {enlace}";

export type InviteVars = Record<InvitePlaceholder, string>;

/**
 * Sustituye los marcadores. Los que no existan se dejan tal cual: si alguien
 * escribe {precio}, verá {precio} en el mensaje y entenderá que no vale, en vez
 * de que desaparezca sin explicación.
 */
export function renderInviteMessage(template: string | null | undefined, vars: InviteVars): string {
  const source = (template ?? "").trim() || DEFAULT_INVITE_MESSAGE;

  return source.replace(/\{(\w+)\}/g, (whole, key: string) =>
    INVITE_PLACEHOLDERS.includes(key as InvitePlaceholder)
      ? vars[key as InvitePlaceholder]
      : whole
  );
}

/** Marcadores usados en una plantilla, para avisar si falta {enlace}. */
export function usedPlaceholders(template: string): InvitePlaceholder[] {
  const found = new Set<InvitePlaceholder>();
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const key = match[1] as InvitePlaceholder;
    if (INVITE_PLACEHOLDERS.includes(key)) found.add(key);
  }
  return [...found];
}
