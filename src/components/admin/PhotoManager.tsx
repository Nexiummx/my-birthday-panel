"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Camera } from "lucide-react";
import type { PublicPhoto } from "@/lib/public-photo";
import { cn } from "@/lib/utils";

/**
 * Moderación de las fotos del evento.
 *
 * Ocultar y borrar son cosas distintas a propósito. Ocultar es reversible y no
 * toca el archivo: sirve para quitar de la vista una foto desafortunada sin
 * destruir el recuerdo de quien la subió. Borrar sí elimina el archivo, y por
 * eso pide confirmación.
 */
export function PhotoManager({ photos }: { photos: PublicPhoto[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, init: RequestInit) => {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/photos/${id}`, init);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "No se pudo completar la acción");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (photo: PublicPhoto) =>
    act(photo.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !photo.hidden }),
    });

  const remove = (photo: PublicPhoto) => {
    if (
      !confirm(
        `¿Eliminar la foto de ${photo.authorName}?\n\nSe borra el archivo y no se puede deshacer. Si solo quieres quitarla de la galería, ocúltala.`
      )
    ) {
      return;
    }
    return act(photo.id, { method: "DELETE" });
  };

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<Camera className="size-8" aria-hidden="true" />}
        title="Todavía no hay fotos"
        description="Comparte el enlace o el código QR con tus invitados y las fotos van apareciendo aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <li
            key={photo.id}
            className={cn(
              "overflow-hidden rounded-2xl border border-cream-200 bg-cream-50",
              photo.hidden && "opacity-60"
            )}
          >
            <div className="relative aspect-square bg-cream-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- viven en
                  almacenamiento externo y ya llegan comprimidas; ver PhotoGallery */}
              <img
                src={photo.url}
                alt={`Foto de ${photo.authorName}`}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              {photo.hidden && (
                <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-cream-50">
                  Oculta
                </span>
              )}
            </div>

            <div className="space-y-2 p-3">
              <p className="truncate font-sans text-xs text-ink-700">{photo.authorName}</p>
              <p className="font-sans text-[11px] text-ink-500">{photo.atLabel}</p>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busyId === photo.id}
                  onClick={() => toggle(photo)}
                  icon={
                    photo.hidden ? (
                      <Eye className="size-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    )
                  }
                >
                  {photo.hidden ? "Mostrar" : "Ocultar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busyId === photo.id}
                  onClick={() => remove(photo)}
                  aria-label={`Eliminar la foto de ${photo.authorName}`}
                  icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
