"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Play, X } from "lucide-react";
import type { PublicClip } from "@/lib/public-clip";
import { useScrollLock } from "@/lib/hooks";

/**
 * Los videos del evento.
 *
 * Es un carril horizontal y no una cuadrícula como las fotos, por dos razones.
 * La primera es que separa de un vistazo lo que es video de lo que es foto sin
 * necesidad de una etiqueta. La segunda es que un carril enseña pocos a la vez,
 * y eso importa: aunque solo se descargan las portadas, poner quince videos en
 * pantalla invita a tocarlos todos seguidos.
 *
 * Nada se reproduce hasta que alguien lo pide. Un carril que arranca solo, con
 * sonido, en el móvil de alguien que acaba de entrar, es de las pocas cosas que
 * hacen cerrar una página.
 */
export function ClipGallery({ clips }: { clips: PublicClip[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (clips.length === 0) return null;

  return (
    <>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {clips.map((clip, index) => (
          <li key={clip.id} className="w-40 shrink-0 snap-start sm:w-48">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-2xl border border-cream-100/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <span className="block aspect-[9/16] w-full bg-black/40">
                {clip.posterUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- ver PhotoGallery */
                  <img
                    src={clip.posterUrl}
                    alt={clip.caption ?? `Video de ${clip.authorName}`}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  // Clips subidos antes de que existieran las portadas.
                  <span className="flex size-full items-center justify-center">
                    <Film className="size-7 opacity-50" aria-hidden="true" />
                  </span>
                )}
              </span>

              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/45 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Play className="size-5 fill-current" aria-hidden="true" />
                </span>
              </span>

              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-8 text-left font-sans text-[11px]">
                <span className="min-w-0 truncate">{clip.authorName}</span>
                <span className="shrink-0 tabular-nums opacity-80">{clip.durationLabel}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <ClipPlayer clip={clips[openIndex]} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}

function ClipPlayer({ clip, onClose }: { clip: PublicClip; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useScrollLock(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Video de ${clip.authorName}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white/80">
        <p className="min-w-0 truncate font-sans text-sm">
          {clip.authorName}
          <span className="ml-2 text-white/50">{clip.atLabel}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        {/* Con sonido y con controles: se abrió a propósito, y un video de una
            fiesta sin audio no es el video de esa fiesta. */}
        <video
          ref={videoRef}
          src={clip.url}
          poster={clip.posterUrl ?? undefined}
          controls
          autoPlay
          playsInline
          className="max-h-full max-w-full rounded-lg"
        />
      </div>

      {clip.caption && (
        <p className="px-6 pb-6 text-center font-sans text-sm text-white/75">{clip.caption}</p>
      )}
    </div>
  );
}
