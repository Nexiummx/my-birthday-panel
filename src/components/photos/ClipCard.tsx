"use client";

import { useEffect, useRef } from "react";
import type { PublicClip } from "@/lib/public-clip";

/**
 * Un clip a pantalla completa dentro del recuerdo.
 *
 * Arranca solo porque unas stories que hay que tocar para que pasen algo no son
 * stories. Empieza sin sonido —es lo único que los navegadores dejan reproducir
 * sin gesto, y también lo único educado— y el reproductor tiene un botón para
 * encenderlo, que se recuerda de un clip al siguiente.
 *
 * `object-contain` y no `cover`: un clip vertical dentro de una pantalla
 * vertical encaja, pero uno grabado en horizontal recortado a lo alto se queda
 * en un primer plano de la mesa. Vale más una banda negra que perder la mitad.
 */
export function ClipCard({
  clip,
  muted,
  paused,
}: {
  clip: PublicClip;
  muted: boolean;
  paused: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // El atributo `muted` de React no siempre llega al elemento antes de que el
  // navegador decida si permite la reproducción; escribirlo en la propiedad sí.
  //
  // La pausa se obedece aquí y no en el reproductor: mantener pulsado congela
  // la pantalla, y un video que siguiera corriendo detrás la desmentiría.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (paused) {
      video.pause();
      return;
    }
    // Un fallo aquí solo significa que el navegador no quiso arrancar solo: la
    // pantalla sigue avanzando igual y no hay nada que decirle a nadie.
    void video.play().catch(() => undefined);
  }, [muted, paused]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <video
        ref={videoRef}
        src={clip.url}
        poster={clip.posterUrl ?? undefined}
        autoPlay
        loop
        muted={muted}
        playsInline
        preload="auto"
        className="absolute inset-0 size-full object-contain"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35"
      />

      <div className="absolute inset-x-0 bottom-0 p-7 text-left sm:p-10">
        {clip.caption && (
          <p className="rw-in max-w-lg font-serif text-[clamp(1.3rem,4vh,2rem)] leading-snug">
            “{clip.caption}”
          </p>
        )}
        <p className="rw-in mt-3 font-sans text-[11px] uppercase tracking-[0.28em] opacity-75">
          {clip.authorName}
        </p>
      </div>
    </div>
  );
}
