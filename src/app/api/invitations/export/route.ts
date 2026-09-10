import { requireSession } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { listForExport } from "@/lib/services/invitations";
import { requireActiveEvent } from "@/lib/services/events";
import { csvFilename, toCsv } from "@/lib/csv";
import { STAGE_LABELS, stageOf } from "@/lib/invite-stage";
import { formatPhone } from "@/lib/phone";
import { buildInvitationUrl } from "@/lib/utils";

const HEADERS = [
  "Invitado",
  "Pases",
  "Teléfono",
  "Estado",
  "Confirmados",
  "Llegaron",
  "Mensaje del invitado",
  "Enviada",
  "Abierta",
  "Veces abierta",
  "Enlace",
];

/** ISO corto y estable: la fecha la va a leer una hoja de cálculo, no una persona. */
const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 16).replace("T", " ") : "");

/**
 * La lista completa del evento activo, en CSV.
 *
 * Existe porque el día del evento la lista deja el panel: se la queda el salón,
 * el catering o quien pasa lista en la puerta, y esa gente trabaja en Excel.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const event = await requireActiveEvent(session.sub);
    const invitations = await listForExport(session.sub, event.id);

    const csv = toCsv(
      HEADERS,
      invitations.map((invitation) => [
        invitation.guestName,
        invitation.guestCount,
        formatPhone(invitation.phone) ?? "",
        STAGE_LABELS[stageOf(invitation)],
        invitation.rsvp?.status === "CONFIRMED" ? invitation.rsvp.guestCount : 0,
        invitation.checkedInCount,
        invitation.rsvp?.comment ?? "",
        iso(invitation.sentAt),
        iso(invitation.firstViewedAt),
        invitation.viewCount,
        buildInvitationUrl(event.slug, invitation.slug),
      ])
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(event.name, "invitados")}"`,
        // La lista cambia cada vez que alguien confirma: nunca de la caché.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
