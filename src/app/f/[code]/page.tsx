import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPhotosScreen } from "@/components/photos/EventPhotosScreen";
import { getEventByShareCode, listPhotos } from "@/lib/services/photos";
import { toPublicPhoto } from "@/lib/public-photo";

// Las fotos aparecen en cuanto alguien sube: nada que prerrenderizar.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByShareCode(code);

  return {
    title: event ? `Fotos de ${event.name}` : "Fotos",
    // Sin indexar: es un enlace privado del evento, como la invitación.
    robots: { index: false, follow: false },
  };
}

/**
 * La puerta del QR de las mesas.
 *
 * Es pública y sin cuenta a propósito: en una fiesta nadie se registra para
 * mandar una foto, y los acompañantes —que no tienen invitación propia—
 * también tienen fotos que valen la pena.
 */
export default async function EventPhotosPage({ params }: Props) {
  const { code } = await params;
  const event = await getEventByShareCode(code);

  if (!event) {
    notFound();
  }

  const photos = await listPhotos(event.id);

  return <EventPhotosScreen event={event} photos={photos.map(toPublicPhoto)} />;
}
