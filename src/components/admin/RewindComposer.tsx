"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clapperboard, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface CurablePhoto {
  id: string;
  url: string;
  authorName: string;
  caption: string | null;
  rewindOrder: number | null;
}

export interface CurableMessage {
  id: string;
  author: string;
  text: string;
  rewindOrder: number | null;
}

/** Ids ya elegidos, en su orden. Vacío = el recuerdo elige solo. */
function initialSelection(items: { id: string; rewindOrder: number | null }[]): string[] {
  return items
    .filter((item) => item.rewindOrder !== null)
    .sort((a, b) => (a.rewindOrder ?? 0) - (b.rewindOrder ?? 0))
    .map((item) => item.id);
}

/**
 * Compositor del recuerdo.
 *
 * Trabaja con listas ordenadas de ids en vez de un interruptor por elemento,
 * porque en un recuerdo el orden ES contenido: la primera foto es la portada.
 * Al guardar se manda la lista entera, así que encender, apagar y mover son la
 * misma operación y no hay estados a medias.
 *
 * Con las dos listas vacías, el recuerdo vuelve a elegir solo. Eso es una
 * función, no un hueco: es el estado en el que está todo evento hasta que
 * alguien decide meter mano, y al que se puede volver con un botón.
 */
export function RewindComposer({
  photos,
  messages,
  rewindUrl,
  maxPhotos,
  maxMessages,
}: {
  photos: CurablePhoto[];
  messages: CurableMessage[];
  rewindUrl: string;
  maxPhotos: number;
  maxMessages: number;
}) {
  const router = useRouter();
  const [photoIds, setPhotoIds] = useState<string[]>(() => initialSelection(photos));
  const [messageIds, setMessageIds] = useState<string[]>(() => initialSelection(messages));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoById = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);
  const automatic = photoIds.length === 0 && messageIds.length === 0;

  // Se compara contra lo que hay en el servidor, que llega por props: tras
  // guardar, router.refresh() trae los datos nuevos y el botón se apaga solo.
  // Un estado propio de "ya guardé" se desincronizaría del servidor.
  const original = useMemo(
    () => JSON.stringify([initialSelection(photos), initialSelection(messages)]),
    [photos, messages]
  );
  const dirty = JSON.stringify([photoIds, messageIds]) !== original;

  const toggle = (
    id: string,
    list: string[],
    setList: (next: string[]) => void,
    max: number
  ) => {
    setError(null);
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
      return;
    }
    if (list.length >= max) {
      setError(`Ya elegiste ${max}. Quita uno para poder añadir otro.`);
      return;
    }
    setList([...list, id]);
  };

  const move = (id: string, list: string[], setList: (next: string[]) => void, delta: number) => {
    const from = list.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    setList(next);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/rewind", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds, messageIds }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "No se pudo guardar la selección");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPhotoIds([]);
    setMessageIds([]);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5",
          automatic ? "border-cream-200 bg-cream-50" : "border-olive-600/30 bg-olive-600/6"
        )}
      >
        <div className="min-w-0">
          <p className="font-serif text-lg text-ink-900">
            {automatic ? "El recuerdo se arma solo" : "Recuerdo a tu medida"}
          </p>
          <p className="mt-1 max-w-xl font-sans text-sm text-ink-500">
            {automatic
              ? "Ahora mismo elegimos nosotros: las fotos más recientes y los mensajes más largos. En cuanto marques algo aquí abajo, manda tu selección."
              : `Se muestran ${photoIds.length} ${photoIds.length === 1 ? "foto" : "fotos"} y ${messageIds.length} ${messageIds.length === 1 ? "mensaje" : "mensajes"}, en este orden. La primera foto es la portada.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!automatic && (
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            >
              Volver a automático
            </Button>
          )}
          <Link
            href={rewindUrl}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 font-sans text-xs text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-900"
          >
            <Clapperboard className="size-3.5" aria-hidden="true" />
            Ver el recuerdo
          </Link>
          <Button
            size="sm"
            onClick={save}
            loading={busy}
            disabled={!dirty}
            icon={<Save className="size-3.5" aria-hidden="true" />}
          >
            {dirty ? "Guardar" : "Guardado"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      {photoIds.length > 0 && (
        <section aria-labelledby="orden" className="space-y-3">
          <h2 id="orden" className="font-serif text-xl text-ink-900">
            En este orden
          </h2>
          <ul className="flex flex-wrap gap-3">
            {photoIds.map((id, index) => {
              const photo = photoById.get(id);
              if (!photo) return null;
              return (
                <li key={id} className="relative">
                  <span className="block overflow-hidden rounded-xl border border-olive-600/40">
                    {/* eslint-disable-next-line @next/next/no-img-element -- ver PhotoGallery */}
                    <img src={photo.url} alt="" className="size-24 object-cover" loading="lazy" />
                  </span>
                  <span className="absolute left-1 top-1 rounded-full bg-ink-900/85 px-1.5 py-0.5 font-sans text-[10px] font-medium text-cream-50">
                    {index === 0 ? "Portada" : index + 1}
                  </span>
                  <span className="mt-1 flex justify-center gap-0.5">
                    <IconButton
                      label="Mover antes"
                      onClick={() => move(id, photoIds, setPhotoIds, -1)}
                      disabled={index === 0}
                    >
                      <ArrowLeft className="size-3" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Quitar del recuerdo"
                      onClick={() => toggle(id, photoIds, setPhotoIds, maxPhotos)}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Mover después"
                      onClick={() => move(id, photoIds, setPhotoIds, 1)}
                      disabled={index === photoIds.length - 1}
                    >
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </IconButton>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="fotos" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="fotos" className="font-serif text-xl text-ink-900">
            Fotos
          </h2>
          <p className="font-sans text-xs text-ink-500">
            {photoIds.length} de {maxPhotos} elegidas
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-cream-300 px-4 py-8 text-center font-sans text-sm text-ink-500">
            Todavía no hay fotos visibles en este evento.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((photo) => {
              const position = photoIds.indexOf(photo.id);
              const chosen = position !== -1;
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => toggle(photo.id, photoIds, setPhotoIds, maxPhotos)}
                    aria-pressed={chosen}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-xl border-2 transition-colors",
                      chosen ? "border-olive-600" : "border-transparent hover:border-cream-300"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- ver PhotoGallery */}
                    <img
                      src={photo.url}
                      alt={`Foto de ${photo.authorName}`}
                      loading="lazy"
                      decoding="async"
                      className={cn("aspect-square w-full object-cover", !chosen && "opacity-75")}
                    />
                    {chosen && (
                      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-olive-600 text-cream-50">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="mensajes" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mensajes" className="font-serif text-xl text-ink-900">
            Mensajes
          </h2>
          <p className="font-sans text-xs text-ink-500">
            {messageIds.length} de {maxMessages} elegidos
          </p>
        </div>

        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-cream-300 px-4 py-8 text-center font-sans text-sm text-ink-500">
            Nadie ha dejado mensaje al confirmar todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => {
              const position = messageIds.indexOf(message.id);
              const chosen = position !== -1;
              return (
                <li key={message.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                      chosen ? "border-olive-600 bg-olive-600/6" : "border-cream-200 bg-cream-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(message.id, messageIds, setMessageIds, maxMessages)}
                      aria-pressed={chosen}
                      aria-label={
                        chosen
                          ? `Quitar el mensaje de ${message.author} del recuerdo`
                          : `Añadir el mensaje de ${message.author} al recuerdo`
                      }
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        chosen
                          ? "border-olive-600 bg-olive-600 text-cream-50"
                          : "border-cream-300 hover:border-olive-600"
                      )}
                    >
                      {chosen && <Check className="size-3" aria-hidden="true" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm leading-relaxed text-ink-700">
                        {message.text}
                      </p>
                      <p className="mt-1 font-sans text-xs text-ink-500">{message.author}</p>
                    </div>

                    {chosen && (
                      <span className="flex shrink-0 items-center gap-0.5">
                        <span className="mr-1 font-sans text-xs text-olive-700">{position + 1}</span>
                        <IconButton
                          label="Mover antes"
                          onClick={() => move(message.id, messageIds, setMessageIds, -1)}
                          disabled={position === 0}
                        >
                          <ArrowLeft className="size-3" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label="Mover después"
                          onClick={() => move(message.id, messageIds, setMessageIds, 1)}
                          disabled={position === messageIds.length - 1}
                        >
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </IconButton>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md p-1 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
