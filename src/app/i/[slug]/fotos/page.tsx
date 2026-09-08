import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPhotosScreen } from "@/components/photos/EventPhotosScreen";
import { getPublicInvitation } from "@/lib/services/invitations";
import { listPhotos } from "@/lib/services/photos";
import { toPublicPhoto } from "@/lib/public-photo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublicInvitation(slug);

  return {
    title: invitation ? `Fotos de ${invitation.event.name}` : "Fotos",
    robots: { index: false, follow: false },
  };
}

/**
 * La puerta del invitado. Entra con su enlace de siempre, así que la foto queda
 * firmada con su nombre sin pedirle que lo escriba.
 */
export default async function InvitationPhotosPage({ params }: Props) {
  const { slug } = await params;
  const invitation = await getPublicInvitation(slug);

  if (!invitation) {
    notFound();
  }

  const photos = await listPhotos(invitation.event.id);

  return (
    <EventPhotosScreen
      event={invitation.event}
      photos={photos.map(toPublicPhoto)}
      slug={invitation.slug}
      guestName={invitation.guestName}
    />
  );
}
