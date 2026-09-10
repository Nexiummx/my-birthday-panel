import { notFound, permanentRedirect } from "next/navigation";
import { findLegacyInvitation } from "@/lib/services/invitations";
import { invitationPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Misma historia que la invitación: ver ../page.tsx. */
export default async function LegacyInvitationPhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invitation = await findLegacyInvitation(slug);

  if (!invitation) {
    notFound();
  }

  permanentRedirect(`${invitationPath(invitation.event.slug, invitation.slug)}/fotos`);
}
