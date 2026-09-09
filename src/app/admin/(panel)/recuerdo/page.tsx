import type { Metadata } from "next";
import { NoEventState } from "@/components/admin/NoEventState";
import { RewindComposer } from "@/components/admin/RewindComposer";
import {
  MAX_REWIND_MESSAGES,
  MAX_REWIND_PHOTOS,
  getCuration,
} from "@/lib/services/rewind-curation";
import { requirePanelContext } from "@/lib/panel";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuerdo · Panel",
  robots: { index: false, follow: false },
};

export default async function RewindPage() {
  const { session, event } = await requirePanelContext();
  if (!event) return <NoEventState />;

  const curation = await getCuration(event.id, session.sub);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Recuerdos
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          El recuerdo
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          El resumen que ven tus invitados después de la fiesta. Elige qué fotos y qué mensajes
          salen, y en qué orden; si no eliges nada, lo armamos nosotros.
        </p>
      </header>

      <RewindComposer
        photos={curation.photos}
        messages={curation.messages}
        rewindUrl={`${siteUrl()}/r/${event.shareCode}`}
        maxPhotos={MAX_REWIND_PHOTOS}
        maxMessages={MAX_REWIND_MESSAGES}
      />
    </div>
  );
}
