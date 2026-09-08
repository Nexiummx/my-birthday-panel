import Link from "next/link";
import { ArrowLeft, CameraOff, Clapperboard } from "lucide-react";
import { PhotoGallery } from "@/components/photos/PhotoGallery";
import { PhotoUploader } from "@/components/photos/PhotoUploader";
import { Scene } from "@/components/invitation/scenes/Scene";
import type { PublicPhoto } from "@/lib/public-photo";
import { getTheme } from "@/lib/themes";
import { themeFontVariables } from "@/lib/theme-fonts";
import type { EventThemeValue } from "@/lib/validations";
import { formatInvitationDate } from "@/lib/utils";

/**
 * Pantalla de fotos de un evento. La comparten las dos puertas de entrada:
 *
 *   /f/[code]       el QR de las mesas. Hay que escribir el nombre.
 *   /i/[slug]/fotos desde la invitación. El nombre ya lo sabemos.
 *
 * Es la misma pantalla a propósito: quien llega por un lado y por el otro tiene
 * que ver lo mismo, y así solo hay un sitio donde tocar el diseño.
 */
export function EventPhotosScreen({
  event,
  photos,
  slug,
  guestName,
}: {
  event: {
    name: string;
    date: Date;
    time: string;
    theme: string;
    shareCode: string;
    photosEnabled: boolean;
  };
  photos: PublicPhoto[];
  slug?: string;
  guestName?: string;
}) {
  const theme = getTheme(event.theme as EventThemeValue);

  return (
    // La misma escena del tema que la invitación, no un fondo plano: quien
    // llega aquí desde su invitación tiene que sentir que sigue en la misma
    // pieza, y quien llega por el QR debe entender de qué fiesta se trata antes
    // de leer una palabra.
    <div data-theme={theme.attribute} className={`${themeFontVariables} text-cream-100`}>
      <Scene theme={event.theme as EventThemeValue}>
      {/* Penumbra sobre la escena. La invitación resuelve esto mismo bajo su
          texto de bienvenida, y aquí hace falta igual: el elemento más
          detallado del tema —la bola de espejos, la luna— cae justo donde va el
          título. El color sale de --shade, así que cada tema pone el suyo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--shade) 0%, color-mix(in srgb, var(--shade) 45%, transparent) 32%, color-mix(in srgb, var(--shade) 60%, transparent) 70%, var(--shade) 100%)",
        }}
      />
      <main className="relative mx-auto flex max-w-3xl flex-col gap-10 px-5 py-12 sm:px-6 sm:py-16">
        <header className="text-center">
          {slug && (
            <Link
              href={`/i/${slug}`}
              className="mb-6 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] opacity-70 transition-opacity hover:opacity-100"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Volver a la invitación
            </Link>
          )}

          <p className="font-sans text-[11px] uppercase tracking-[0.28em] opacity-70">
            Fotos de la fiesta
          </p>
          <h1 className="mt-3 font-display-script text-5xl leading-tight">{event.name}</h1>
          <p className="mt-2 font-sans text-sm opacity-75">
            {formatInvitationDate(event.date)} · {event.time}
          </p>
        </header>

        {/* Field pinta sus etiquetas con los tonos del panel, que son oscuros:
            sobre esta tarjeta oscura no se leen. Se corrige aquí, donde vive la
            superficie, y no dentro de Field, que en el panel está bien. */}
        <section
          aria-label="Subir fotos"
          className="rounded-3xl border border-cream-100/20 bg-black/35 p-5 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md sm:p-6 [&_label]:text-cream-100/75"
        >
          {event.photosEnabled ? (
            <>
              <p className="mb-4 text-center font-sans text-sm opacity-80">
                {guestName
                  ? `Sube las que tomaste, ${guestName.split(" ")[0]}. Las ve todo el mundo al instante.`
                  : "Sube las que tomaste. Las ve todo el mundo al instante."}
              </p>
              <PhotoUploader
                code={slug ? undefined : event.shareCode}
                slug={slug}
                guestName={guestName}
              />
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 py-4 text-center font-sans text-sm opacity-80">
              <CameraOff className="size-4" aria-hidden="true" />
              El anfitrión cerró la subida de fotos.
            </p>
          )}
        </section>

        {photos.length > 0 && (
          <section aria-label="Fotos del evento" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">
                {photos.length === 1 ? "1 foto" : `${photos.length} fotos`}
              </h2>
              <Link
                href={`/r/${event.shareCode}`}
                className="inline-flex items-center gap-2 rounded-full border border-cream-100/25 px-4 py-2 font-sans text-xs uppercase tracking-wider transition-colors hover:border-gold-400 hover:text-gold-400"
              >
                <Clapperboard className="size-4" aria-hidden="true" />
                Ver el recuerdo
              </Link>
            </div>

            <PhotoGallery photos={photos} />
          </section>
        )}
      </main>
      </Scene>
    </div>
  );
}
