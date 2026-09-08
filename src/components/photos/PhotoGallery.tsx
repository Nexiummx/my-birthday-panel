"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import type { PublicPhoto } from "@/lib/public-photo";
import { useScrollLock } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Galería de las fotos del evento.
 *
 * Se maqueta con columnas CSS y no con una cuadrícula: las fotos de una fiesta
 * vienen en vertical y en horizontal mezcladas, y una cuadrícula obligaría a
 * recortarlas todas al mismo alto. Cada foto declara su tamaño real, así que el
 * hueco se reserva antes de cargar y la página no baila.
 */
export function PhotoGallery({ photos }: { photos: PublicPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-300/40 px-6 py-12 text-center">
        <ImageOff className="size-7 opacity-50" aria-hidden="true" />
        <p className="font-sans text-sm opacity-80">Todavía no hay fotos. Sé el primero.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 [&>li]:mb-3">
        {photos.map((photo, index) => (
          <li key={photo.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Las fotos
                  viven en un almacenamiento externo y ya llegan comprimidas a
                  1600 px desde el navegador; pasarlas por el optimizador de
                  Next solo añadiría coste y una lista de dominios que mantener. */}
              <img
                src={photo.url}
                alt={photo.caption ?? `Foto de ${photo.authorName}`}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6 text-left font-sans text-[11px] text-white/90">
                {photo.authorName}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        photos={photos}
        index={openIndex}
        onChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}

function Lightbox({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: PublicPhoto[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + photos.length) % photos.length);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onChange, onClose]);

  if (index === null) return null;
  const photo = photos[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${photo.authorName}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white/80">
        <p className="min-w-0 truncate font-sans text-sm">
          {photo.authorName}
          <span className="ml-2 text-white/50">{photo.atLabel}</span>
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

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- misma razón que en la cuadrícula */}
        <img
          src={photo.url}
          alt={photo.caption ?? `Foto de ${photo.authorName}`}
          className="max-h-full max-w-full rounded-lg object-contain"
        />

        {photos.length > 1 && (
          <>
            <LightboxArrow
              side="left"
              onClick={() => onChange((index - 1 + photos.length) % photos.length)}
            />
            <LightboxArrow side="right" onClick={() => onChange((index + 1) % photos.length)} />
          </>
        )}
      </div>

      {photo.caption && (
        <p className="px-6 pb-6 text-center font-sans text-sm text-white/75">{photo.caption}</p>
      )}
    </div>
  );
}

function LightboxArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Foto anterior" : "Foto siguiente"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white/80 transition-colors hover:bg-black/70",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
