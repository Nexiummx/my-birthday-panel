"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Una pieza moderable, ya sea foto o video. El componente solo necesita algo
 * que enseñar y a quién atribuírselo, así que recibe justo eso: un video llega
 * con la URL de su portada, no con la del video, y la rejilla no se entera.
 */
export interface ManagedMedia {
  id: string;
  /** Lo que se pinta en la rejilla. En un video, su portada. */
  thumbUrl: string | null;
  authorName: string;
  atLabel: string;
  hidden: boolean;
  video: boolean;
  /** "0:12" en los videos. */
  durationLabel?: string;
}

/**
 * Moderación de lo que suben los invitados.
 *
 * Ocultar y borrar son cosas distintas a propósito. Ocultar es reversible y no
 * toca el archivo: sirve para quitar de la vista una foto desafortunada sin
 * destruir el recuerdo de quien la subió. Borrar sí elimina el archivo, y por
 * eso pide confirmación.
 *
 * Fotos y videos van en la misma rejilla y no en dos pestañas: quien entra aquí
 * viene a quitar algo concreto que acaba de ver, y buscarlo es más rápido en una
 * sola lista por orden de llegada que decidiendo primero de qué tipo era.
 */
export function PhotoManager({ items }: { items: ManagedMedia[] }) {
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

  const toggle = (item: ManagedMedia) =>
    act(item.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !item.hidden }),
    });

  const remove = (item: ManagedMedia) => {
    const noun = item.video ? "el video" : "la foto";
    if (
      !confirm(
        `¿Eliminar ${noun} de ${item.authorName}?\n\nSe borra el archivo y no se puede deshacer. Si solo quieres quitarlo de la galería, ocúltalo.`
      )
    ) {
      return;
    }
    return act(item.id, { method: "DELETE" });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Camera className="size-8" aria-hidden="true" />}
        title="Todavía no hay nada"
        description="Comparte el enlace o el código QR con tus invitados y sus fotos y videos van apareciendo aquí."
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
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "overflow-hidden rounded-2xl border border-cream-200 bg-cream-50",
              item.hidden && "opacity-60"
            )}
          >
            <div className="relative aspect-square bg-cream-200">
              {item.thumbUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- viven en
                   almacenamiento externo y ya llegan comprimidas; ver PhotoGallery */
                <img
                  src={item.thumbUrl}
                  alt={`${item.video ? "Video" : "Foto"} de ${item.authorName}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <Film className="size-6 text-ink-500" aria-hidden="true" />
                </span>
              )}

              {item.hidden && (
                <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-cream-50">
                  {item.video ? "Oculto" : "Oculta"}
                </span>
              )}

              {item.video && (
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink-900/80 px-2 py-0.5 font-sans text-[10px] text-cream-50">
                  <Film className="size-3" aria-hidden="true" />
                  {item.durationLabel}
                </span>
              )}
            </div>

            <div className="space-y-2 p-3">
              <p className="truncate font-sans text-xs text-ink-700">{item.authorName}</p>
              <p className="font-sans text-[11px] text-ink-500">{item.atLabel}</p>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busyId === item.id}
                  onClick={() => toggle(item)}
                  icon={
                    item.hidden ? (
                      <Eye className="size-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    )
                  }
                >
                  {item.hidden ? "Mostrar" : "Ocultar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busyId === item.id}
                  onClick={() => remove(item)}
                  aria-label={`Eliminar ${item.video ? "el video" : "la foto"} de ${item.authorName}`}
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
