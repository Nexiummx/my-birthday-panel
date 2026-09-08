import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RewindPlayer } from "@/components/photos/RewindPlayer";
import { getEventByShareCode } from "@/lib/services/photos";
import { buildRewind } from "@/lib/services/rewind";
import { themeFontVariables } from "@/lib/theme-fonts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByShareCode(code);

  return {
    title: event ? `El recuerdo de ${event.name}` : "Recuerdo",
    robots: { index: false, follow: false },
  };
}

/**
 * El recuerdo del evento: lo que pasó, contado en pantallas.
 *
 * Se arma entero en el servidor —ver services/rewind.ts— así que el navegador
 * no recibe la lista de invitados ni los mensajes que no se van a enseñar.
 */
export default async function RewindPage({ params }: Props) {
  const { code } = await params;
  const event = await getEventByShareCode(code);

  if (!event) {
    notFound();
  }

  const deck = await buildRewind(event);

  return (
    <div className={themeFontVariables}>
      <RewindPlayer deck={deck} />
    </div>
  );
}
