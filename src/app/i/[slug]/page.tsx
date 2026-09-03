import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/invitation/InvitationExperience";
import { toPublicInvitation } from "@/lib/public-invitation";
import { getPublicInvitation } from "@/lib/services/invitations";
import { formatInvitationDate } from "@/lib/utils";

// Cada invitación refleja el RSVP más reciente: siempre se renderiza en vivo.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublicInvitation(slug);

  if (!invitation) {
    return { title: "Invitación no encontrada" };
  }

  const title = `${invitation.event.name} · Invitación para ${invitation.guestName}`;
  const place = invitation.event.location.split("\n")[0];
  const description = `${formatInvitationDate(invitation.event.date)} · ${invitation.event.time} · ${place}`;

  // La miniatura la aporta opengraph-image.tsx, en este mismo segmento.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/i/${slug}`,
      siteName: "Bosque Encantado",
      locale: "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

export default async function InvitationPage({ params }: Props) {
  const { slug } = await params;
  const invitation = await getPublicInvitation(slug);

  if (!invitation) {
    notFound();
  }

  return <InvitationExperience invitation={toPublicInvitation(invitation)} />;
}
