import type { Metadata } from "next";
import { NoEventState } from "@/components/admin/NoEventState";
import { RecapStudio } from "@/components/admin/RecapStudio";
import { RewindComposer } from "@/components/admin/RewindComposer";
import { SoundtrackPicker } from "@/components/admin/SoundtrackPicker";
import { planFilm } from "@/lib/recap-film";
import { photoUrl } from "@/lib/services/photos";
import { buildRecap } from "@/lib/services/recap";
import {
  MAX_REWIND_CLIPS,
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

  const [curation, reel] = await Promise.all([
    getCuration(event.id, session.sub),
    buildRecap(event),
  ]);

  // La duración del video la manda el guion, y la necesitan las dos pantallas:
  // el editor de música para saber cuánto abarca la ventana, y el generador
  // para saber cuánto grabar. Se calcula una vez, aquí.
  const film = planFilm(reel.scenes);

  const soundtrack = event.soundtrackPath
    ? {
        url: photoUrl(event.soundtrackPath),
        name: event.soundtrackName ?? "Música del evento",
        startMs: event.soundtrackStartMs,
      }
    : null;

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
        clips={curation.clips}
        messages={curation.messages}
        rewindUrl={`${siteUrl()}/r/${event.shareCode}`}
        maxPhotos={MAX_REWIND_PHOTOS}
        maxClips={MAX_REWIND_CLIPS}
        maxMessages={MAX_REWIND_MESSAGES}
      />

      <section aria-labelledby="musica" className="space-y-4 border-t border-cream-200 pt-8">
        <div>
          <h2 id="musica" className="font-serif text-2xl font-light text-forest-800">
            Música
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
            Suena en el video para redes y en el recuerdo, para quien le dé al sonido. Elige por
            dónde empieza: el video dura menos de medio minuto y casi ninguna canción arranca por
            su mejor parte.
          </p>
        </div>

        <SoundtrackPicker soundtrack={soundtrack} filmSeconds={film.seconds} />
      </section>

      <section aria-labelledby="video-redes" className="space-y-4 border-t border-cream-200 pt-8">
        <div>
          <h2 id="video-redes" className="font-serif text-2xl font-light text-forest-800">
            Video para redes
          </h2>
          {/* Dos piezas y no una: el recuerdo es para quien fue a la fiesta y se
              busca en él; esto es para quien no fue y lo va a ver de paso. */}
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
            El mismo material, montado para publicar. Se genera aquí, en tu equipo, con las fotos
            que elegiste arriba: lo que ves en la vista previa es exactamente lo que se descarga.
          </p>
        </div>

        <RecapStudio reel={reel} soundtrack={soundtrack} />
      </section>
    </div>
  );
}
