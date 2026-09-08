"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

/** Se recuerda el nombre para no pedirlo en cada tanda de fotos. */
const NAME_KEY = "foto-nombre";

type Status = "esperando" | "subiendo" | "lista" | "error";

interface Item {
  id: string;
  name: string;
  status: Status;
  error?: string;
}

/**
 * Subida de fotos por parte de un invitado.
 *
 * El archivo no pasa por el servidor: se comprime aquí, se pide permiso, y el
 * navegador lo manda directo al almacenamiento. Son tres pasos por foto en vez
 * de uno, pero es la única forma de que funcione con fotos de móvil — el cuerpo
 * de una función serverless en Vercel no llega a 5 MB.
 *
 * Con `slug` (enlace de invitación) el nombre lo pone el servidor y ni se
 * pregunta. Con `code` (el QR de las mesas) hay que escribirlo.
 */
export function PhotoUploader({
  code,
  slug,
  guestName,
}: {
  code?: string;
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

  const send = async (file: File, id: string, authorName: string) => {
    const { blob, width, height, type } = await compressImage(file);

    const signResponse = await fetch("/api/public/photos/firmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, slug, contentType: type, bytes: blob.size }),
    });

    if (!signResponse.ok) {
      const payload = (await signResponse.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "No se pudo preparar la subida");
    }

    const { data } = (await signResponse.json()) as {
      data: { path: string; target: { url: string; method: string; headers: Record<string, string> } };
    };

    const upload = await fetch(data.target.url, {
      method: data.target.method,
      headers: data.target.headers,
      body: blob,
    });

    if (!upload.ok) {
      throw new Error("No se pudo enviar la foto");
    }

    const register = await fetch("/api/public/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        slug,
        path: data.path,
        width,
        height,
        bytes: blob.size,
        authorName,
      }),
    });

    if (!register.ok) {
      const payload = (await register.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "La foto se subió pero no se pudo registrar");
    }

    update(id, { status: "lista" });
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

    const batch: Item[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      status: "esperando",
    }));

    setItems((current) => [...batch, ...current]);
    setBusy(true);

    // En serie y no en paralelo: en la red de una fiesta, cinco subidas a la
    // vez se estorban entre ellas y fallan más que de una en una.
    for (const [index, file] of Array.from(files).entries()) {
      const item = batch[index];
      update(item.id, { status: "subiendo" });
      try {
        await send(file, item.id, authorName);
      } catch (error) {
        update(item.id, {
          status: "error",
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
        accept="image/jpeg,image/png,image/webp"
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
        {busy ? "Subiendo…" : "Elegir fotos"}
      </Button>

      {items.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 font-sans text-xs",
                item.status === "error" ? "bg-blush-200/50 text-blush-500" : "bg-cream-200/60 text-ink-700"
              )}
            >
              {item.status === "subiendo" && <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />}
              {item.status === "lista" && <Check className="size-3.5 shrink-0 text-olive-600" aria-hidden="true" />}
              {item.status === "error" && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0">
                {item.status === "error" ? item.error : item.status === "lista" ? "Lista" : "…"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
