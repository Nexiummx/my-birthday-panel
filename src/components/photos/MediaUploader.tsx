"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { compressImage } from "@/lib/image";
import { VIDEO_MAX_SECONDS, compressVideo, probeVideo } from "@/lib/video";
import { cn } from "@/lib/utils";

/** Se recuerda el nombre para no pedirlo en cada tanda. */
const NAME_KEY = "foto-nombre";

type Status = "esperando" | "preparando" | "subiendo" | "lista" | "error";

interface Item {
  id: string;
  name: string;
  video: boolean;
  status: Status;
  /** 0–1 mientras se comprime un video. Las fotos van demasiado rápido. */
  progress?: number;
  /** Lo que hay que saber antes de esperar: "0:48 · se usan los primeros 0:30". */
  note?: string;
  error?: string;
}

/**
 * Subida de fotos y videos por parte de un invitado.
 *
 * El archivo no pasa por el servidor: se comprime aquí, se pide permiso, y el
 * navegador lo manda directo al almacenamiento. Son tres pasos por archivo en
 * vez de uno, pero es la única forma de que funcione con material de móvil — el
 * cuerpo de una función serverless en Vercel no llega a 5 MB.
 *
 * Fotos y videos comparten un solo botón a propósito. En una fiesta nadie se
 * para a clasificar lo que va a mandar: elige de su carrete y espera que
 * funcione. La diferencia la nota solo en el tiempo de espera, y por eso el
 * video —que tarda lo que dura— es el único que enseña porcentaje.
 *
 * Con `slug` (enlace de invitación, que viene acompañado de su `evento`) el
 * nombre lo pone el servidor y ni se pregunta. Con `code` (el QR de las mesas)
 * hay que escribirlo.
 */
export function MediaUploader({
  code,
  evento,
  slug,
  guestName,
}: {
  code?: string;
  evento?: string;
  slug?: string;
  guestName?: string | null;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const needsName = !slug;

  // Se escribe en el DOM, no en el estado: rellenar estado desde un efecto
  // provoca un render extra y el compilador de React lo marca.
  useEffect(() => {
    if (!needsName) return;
    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved && nameRef.current && !nameRef.current.value) {
      nameRef.current.value = saved;
    }
  }, [needsName]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  /** Manda un blob a donde diga el permiso. */
  const put = async (
    target: { url: string; method: string; headers: Record<string, string> },
    blob: Blob
  ) => {
    const response = await fetch(target.url, {
      method: target.method,
      headers: target.headers,
      body: blob,
    });
    if (!response.ok) {
      throw new Error("No se pudo enviar el archivo");
    }
  };

  const sign = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/public/photos/firmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, evento, slug, ...body }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "No se pudo preparar la subida");
    }

    const { data } = (await response.json()) as {
      data: {
        path: string;
        target: { url: string; method: string; headers: Record<string, string> };
        poster: { path: string; target: { url: string; method: string; headers: Record<string, string> } } | null;
      };
    };
    return data;
  };

  const register = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/public/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, evento, slug, ...body }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "El archivo se subió pero no se pudo registrar");
    }
  };

  const sendPhoto = async (file: File, id: string, authorName: string) => {
    const { blob, width, height, type } = await compressImage(file);
    update(id, { status: "subiendo" });

    const data = await sign({ contentType: type, bytes: blob.size });
    await put(data.target, blob);
    await register({ path: data.path, width, height, bytes: blob.size, authorName });
  };

  const sendVideo = async (file: File, id: string, authorName: string) => {
    const probe = await probeVideo(file);
    update(id, {
      status: "preparando",
      progress: 0,
      note:
        probe.seconds > VIDEO_MAX_SECONDS
          ? `Se usan los primeros ${VIDEO_MAX_SECONDS} s`
          : undefined,
    });

    const clip = await compressVideo(file, (ratio) => update(id, { progress: ratio }));
    update(id, { status: "subiendo" });

    const data = await sign({ kind: "VIDEO", contentType: clip.type, bytes: clip.blob.size });
    await put(data.target, clip.blob);

    // La portada es lo último y no es obligatoria: si falla, el clip ya está
    // arriba y la galería tira del propio video para la miniatura. Perder el
    // video por no haber podido subir su miniatura sería absurdo.
    let posterPath: string | undefined;
    if (data.poster) {
      try {
        await put(data.poster.target, clip.poster.blob);
        posterPath = data.poster.path;
      } catch {
        /* sin portada */
      }
    }

    await register({
      kind: "VIDEO",
      path: data.path,
      width: clip.width,
      height: clip.height,
      bytes: clip.blob.size,
      durationMs: clip.durationMs,
      posterPath,
      authorName,
    });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const authorName = needsName ? (nameRef.current?.value.trim() ?? "") : (guestName ?? "");
    if (needsName && authorName.length < 2) {
      setFormError("Escribe tu nombre para que sepamos de quién son las fotos");
      nameRef.current?.focus();
      return;
    }

    setFormError(null);
    if (needsName) window.localStorage.setItem(NAME_KEY, authorName);

    const chosen = Array.from(files);
    const batch: Item[] = chosen.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      video: file.type.startsWith("video/"),
      status: "esperando",
    }));

    setItems((current) => [...batch, ...current]);
    setBusy(true);

    // En serie y no en paralelo: en la red de una fiesta, cinco subidas a la
    // vez se estorban entre ellas y fallan más que de una en una. Con video hay
    // otra razón: comprimir dos a la vez reproduce dos videos a la vez y el
    // móvil no da para los dos.
    for (const [index, file] of chosen.entries()) {
      const item = batch[index];
      update(item.id, { status: "subiendo" });
      try {
        if (item.video) await sendVideo(file, item.id, authorName);
        else await sendPhoto(file, item.id, authorName);
        update(item.id, { status: "lista", progress: undefined });
      } catch (error) {
        update(item.id, {
          status: "error",
          progress: undefined,
          error: error instanceof Error ? error.message : "Falló la subida",
        });
      }
    }

    setBusy(false);
    // El input guarda los archivos elegidos: sin esto, volver a elegir la misma
    // foto no dispara el evento.
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {needsName && (
        <Field label="Tu nombre" htmlFor="foto-nombre" error={formError ?? undefined}>
          <Input
            id="foto-nombre"
            ref={nameRef}
            placeholder="Ana García"
            autoComplete="name"
            maxLength={80}
          />
        </Field>
      )}

      <input
        ref={inputRef}
        id="foto-archivos"
        type="file"
        accept="image/jpeg,image/png,image/webp,video/*"
        multiple
        className="sr-only"
        onChange={(event) => void onFiles(event.target.files)}
      />

      <Button
        type="button"
        size="lg"
        loading={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full"
        icon={<Camera className="size-5" aria-hidden="true" />}
      >
        {busy ? "Subiendo…" : "Elegir fotos o videos"}
      </Button>

      <p className="text-center font-sans text-xs opacity-60">
        Videos de hasta {VIDEO_MAX_SECONDS} segundos. Se comprimen aquí mismo, así que tardan lo
        que dura el clip.
      </p>

      {items.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl px-3 py-2 font-sans text-xs",
                item.status === "error"
                  ? "bg-blush-200/50 text-blush-500"
                  : "bg-cream-200/60 text-ink-700"
              )}
            >
              <div className="flex items-center gap-2">
                {(item.status === "subiendo" || item.status === "preparando") && (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                )}
                {item.status === "lista" && (
                  <Check className="size-3.5 shrink-0 text-olive-600" aria-hidden="true" />
                )}
                {item.status === "error" && (
                  <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0">
                  {item.status === "error"
                    ? item.error
                    : item.status === "lista"
                      ? "Listo"
                      : item.status === "preparando"
                        ? `Comprimiendo ${Math.round((item.progress ?? 0) * 100)}%`
                        : "…"}
                </span>
              </div>

              {/* La barra solo aparece mientras se comprime un video. Sin ella,
                  medio minuto sin señales parece que se colgó. */}
              {item.status === "preparando" && (
                <span className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-ink-500/20">
                  <span
                    className="block h-full origin-left bg-olive-600 transition-transform duration-200"
                    style={{ transform: `scaleX(${item.progress ?? 0})` }}
                  />
                </span>
              )}

              {item.note && item.status !== "lista" && item.status !== "error" && (
                <p className="mt-1 opacity-70">{item.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
