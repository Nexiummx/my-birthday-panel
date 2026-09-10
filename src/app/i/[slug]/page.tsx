import { notFound, permanentRedirect } from "next/navigation";
import { findLegacyInvitation } from "@/lib/services/invitations";
import { invitationPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Los enlaces de antes de que el evento entrara en la ruta.
 *
 * Esta página existe solo para mandarlos a su sitio nuevo. Hay invitaciones ya
 * enviadas por WhatsApp con la forma vieja, y ese mensaje no se puede editar:
 * si /i/[slug] devolviera 404, para esos invitados la fiesta simplemente
 * desaparecería. Es el mismo criterio que en scripts/rotar-slugs.ts, que
 * tampoco toca lo que ya salió.
 *
 * Redirección permanente para que WhatsApp y los buscadores se queden con la
 * URL nueva y dejen de pedir esta.
 */
export default async function LegacyInvitationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invitation = await findLegacyInvitation(slug);

  if (!invitation) {
    notFound();
  }

  permanentRedirect(invitationPath(invitation.event.slug, invitation.slug));
}
