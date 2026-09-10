import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPhotosScreen } from "@/components/photos/EventPhotosScreen";
import { getPublicInvitation } from "@/lib/services/invitations";
import { listClips, listPhotos } from "@/lib/services/photos";
import { toPublicClip } from "@/lib/public-clip";
import { toPublicPhoto } from "@/lib/public-photo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ evento: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { evento, slug } = await params;
  const invitation = await getPublicInvitation(evento, slug);

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
  const { evento, slug } = await params;
  const invitation = await getPublicInvitation(evento, slug);

  if (!invitation) {
    notFound();
  }

  const [photos, clips] = await Promise.all([listPhotos(invitation.event.id), listClips(invitation.event.id)]);

  return (
    <EventPhotosScreen
      event={invitation.event}
      photos={photos.map(toPublicPhoto)}
      clips={clips.map(toPublicClip)}
      evento={invitation.event.slug}
      slug={invitation.slug}
      guestName={invitation.guestName}
    />
  );
}
