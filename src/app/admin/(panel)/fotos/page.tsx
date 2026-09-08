import type { Metadata } from "next";
import QRCode from "qrcode";
import { NoEventState } from "@/components/admin/NoEventState";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { PhotoShare } from "@/components/admin/PhotoShare";
import { listPhotos, photoStats } from "@/lib/services/photos";
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
  const { event } = await requirePanelContext();
  if (!event) return <NoEventState />;

  const uploadUrl = `${siteUrl()}/f/${event.shareCode}`;
  const rewindUrl = `${siteUrl()}/r/${event.shareCode}`;

  const [photos, stats, qrSvg] = await Promise.all([
    // El panel sí ve las ocultas: son justo las que hay que poder devolver.
    listPhotos(event.id, true),
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
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">Fotos</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Las que suben tus invitados durante la fiesta. Se publican al instante; aquí puedes
          ocultar cualquiera sin borrarla.
        </p>
      </header>

      {storageIsLocal() && (
        <p className="rounded-xl bg-gold-500/12 px-4 py-3 font-sans text-sm text-ink-700">
          Estás en desarrollo: las fotos se guardan en el disco de este equipo, no en la nube.
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

      <section aria-label="Fotos recibidas" className="space-y-4">
        <p className="font-sans text-sm text-ink-500">
          {stats.total === 0
            ? "Sin fotos todavía."
            : `${stats.total} ${stats.total === 1 ? "foto" : "fotos"}` +
              (stats.hidden > 0 ? ` · ${stats.hidden} ocultas` : "") +
              (stats.topAuthors[0] ? ` · quien más sube: ${stats.topAuthors[0].name}` : "")}
        </p>

        <PhotoManager photos={photos.map(toPublicPhoto)} />
      </section>
    </div>
  );
}
