import type { Metadata } from "next";
import QRCode from "qrcode";
import { NoEventState } from "@/components/admin/NoEventState";
import { getQuota } from "@/lib/services/events";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { PhotoShare } from "@/components/admin/PhotoShare";
import { listClips, listPhotos, photoStats } from "@/lib/services/photos";
import { toPublicClip } from "@/lib/public-clip";
import { toPublicPhoto } from "@/lib/public-photo";
import { requirePanelContext } from "@/lib/panel";
import { storageIsLocal } from "@/lib/storage";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fotos · Panel",
  robots: { index: false, follow: false },
};

export default async function PhotosPage() {
  const { session, event } = await requirePanelContext();
  if (!event) return <NoEventState quotaLimit={(await getQuota(session.sub)).limit} />;

  const uploadUrl = `${siteUrl()}/f/${event.shareCode}`;
  const rewindUrl = `${siteUrl()}/r/${event.shareCode}`;

  const [photos, clips, stats, qrSvg] = await Promise.all([
    // El panel sí ve las ocultas: son justo las que hay que poder devolver.
    listPhotos(event.id, true),
    listClips(event.id, true),
    photoStats(event.id),
    // El QR se dibuja en el servidor: es un SVG estático y no hace falta
    // mandarle al navegador una librería para generarlo.
    QRCode.toString(uploadUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">
          Recuerdos
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          Fotos y videos
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Lo que suben tus invitados durante la fiesta, fotos y videos. Se publican al instante;
          aquí puedes ocultar cualquiera sin borrarlo.
        </p>
      </header>

      {storageIsLocal() && (
        <p className="rounded-xl bg-gold-500/12 px-4 py-3 font-sans text-sm text-ink-700">
          Estás en desarrollo: los archivos se guardan en el disco de este equipo, no en la nube.
          Configura <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> para el
          entorno real.
        </p>
      )}

      <PhotoShare
        eventId={event.id}
        uploadUrl={uploadUrl}
        rewindUrl={rewindUrl}
        qrSvg={qrSvg}
        enabled={event.photosEnabled}
      />

      <section aria-label="Fotos y videos recibidos" className="space-y-4">
        <p className="font-sans text-sm text-ink-500">
          {stats.total === 0 && stats.videos === 0
            ? "Sin fotos ni videos todavía."
            : [
                `${stats.total} ${stats.total === 1 ? "foto" : "fotos"}`,
                stats.videos > 0 && `${stats.videos} ${stats.videos === 1 ? "video" : "videos"}`,
                stats.hidden + stats.hiddenVideos > 0 &&
                  `${stats.hidden + stats.hiddenVideos} sin publicar`,
                stats.topAuthors[0] && `quien más sube: ${stats.topAuthors[0].name}`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>

        {/* Ordenados por llegada, mezclando fotos y videos: es como los recuerda
            quien viene a quitar uno. */}
        <PhotoManager
          items={[
            ...photos.map(toPublicPhoto).map((photo) => ({
              id: photo.id,
              thumbUrl: photo.url,
              authorName: photo.authorName,
              atLabel: photo.atLabel,
              hidden: photo.hidden,
              video: false,
            })),
            ...clips.map(toPublicClip).map((clip) => ({
              id: clip.id,
              thumbUrl: clip.posterUrl,
              authorName: clip.authorName,
              atLabel: clip.atLabel,
              hidden: clip.hidden,
              video: true,
              durationLabel: clip.durationLabel,
            })),
          ]}
        />
      </section>
    </div>
  );
}
