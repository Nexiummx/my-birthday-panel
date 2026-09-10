"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Pause, Play, Trash2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  type MusicPlayback,
  decodeAudio,
  peaksFrom,
  playMusic,
} from "@/lib/soundtrack-audio";
import { MAX_AUDIO_BYTES } from "@/lib/validations";
import { cn } from "@/lib/utils";

/**
 * La música del recuerdo: subirla y elegir por dónde suena.
 *
 * Elegir el trozo no es un lujo. El video dura menos de medio minuto y casi
 * ninguna canción empieza por su mejor parte: sin poder mover la ventana, la
 * música casi nunca encaja y el anfitrión acaba quitándola.
 *
 * Por eso se dibuja la onda de verdad y no una barra de tiempo. Los picos son
 * el máximo de cada tramo, no la media —la media de una canción es plana y
 * todas se parecen—, así se ve dónde entra la batería, que es exactamente lo
 * que alguien busca cuando arrastra.
 */

/** Resolución interna del lienzo de la onda. El CSS lo estira al ancho que haya. */
const WAVE_WIDTH = 1200;
const WAVE_HEIGHT = 180;

export interface SoundtrackValue {
  url: string;
  name: string;
  startMs: number;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function SoundtrackPicker({
  soundtrack,
  filmSeconds,
}: {
  soundtrack: SoundtrackValue | null;
  filmSeconds: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const playbackRef = useRef<MusicPlayback | null>(null);
  const dragRef = useRef(false);

  const [startMs, setStartMs] = useState(soundtrack?.startMs ?? 0);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = soundtrack?.url ?? null;

  /** Pinta la onda y la ventana elegida. Imperativo a propósito: son mil
   *  doscientas barras, y un elemento de React por barra sería absurdo. */
  const draw = (peaks: Float32Array | null, total: number, start: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, WAVE_WIDTH, WAVE_HEIGHT);

    if (!peaks) {
      ctx.fillStyle = "rgba(111,114,99,0.5)";
      ctx.font = "500 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Leyendo la canción…", WAVE_WIDTH / 2, WAVE_HEIGHT / 2);
      return;
    }

    const from = total > 0 ? (start / total) * WAVE_WIDTH : 0;
    const width = total > 0 ? (Math.min(filmSeconds, total) / total) * WAVE_WIDTH : WAVE_WIDTH;

    // La ventana elegida, por debajo de las barras.
    ctx.fillStyle = "rgba(90,107,60,0.16)";
    ctx.fillRect(from, 0, width, WAVE_HEIGHT);

    const middle = WAVE_HEIGHT / 2;
    for (let x = 0; x < peaks.length; x += 1) {
      const px = (x / peaks.length) * WAVE_WIDTH;
      const dentro = px >= from && px <= from + width;
      const alto = Math.max(2, peaks[x] * (WAVE_HEIGHT * 0.86));
      ctx.fillStyle = dentro ? "#5a6b3c" : "rgba(111,114,99,0.32)";
      ctx.fillRect(px, middle - alto / 2, WAVE_WIDTH / peaks.length - 0.5, alto);
    }

    // Los bordes de la ventana, para poder agarrarla con la vista.
    ctx.strokeStyle = "#5a6b3c";
    ctx.lineWidth = 3;
    ctx.strokeRect(from, 1.5, width, WAVE_HEIGHT - 3);
  };

  // Decodifica la canción y la dibuja. No toca el estado más que para la
  // duración, que sí hace falta para las etiquetas.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    draw(null, 0, 0);
    void decodeAudio(url)
      .then((buffer) => {
        if (cancelled) return;
        bufferRef.current = buffer;
        peaksRef.current = peaksFrom(buffer, 600);
        setDuration(buffer.duration);
        draw(peaksRef.current, buffer.duration, (soundtrack?.startMs ?? 0) / 1000);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo leer la canción. Prueba con otro MP3.");
      });

    return () => {
      cancelled = true;
    };
    // draw usa refs y filmSeconds, que no cambian dentro de la vida del efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const stopPlayback = () => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPlaying(false);
  };

  // Nadie quiere que la música siga sonando después de cerrar la pantalla.
  useEffect(() => () => playbackRef.current?.stop(), []);

  const moveTo = (clientX: number, target: HTMLCanvasElement) => {
    const bounds = target.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
    const seconds = Math.min(ratio * duration, Math.max(0, duration - 0.5));
    const ms = Math.round(seconds * 1000);
    setStartMs(ms);
    draw(peaksRef.current, duration, seconds);
    return ms;
  };

  const save = async (ms: number) => {
    setError(null);
    const response = await fetch("/api/events/soundtrack", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startMs: ms }),
    });
    if (!response.ok) {
      setError("No se pudo guardar el arranque de la música");
    }
  };

  const upload = async (file: File) => {
    if (file.size > MAX_AUDIO_BYTES) {
      setError("La canción pesa demasiado. Sube un MP3 de menos de 12 MB.");
      return;
    }

    stopPlayback();
    setBusy(true);
    setError(null);

    try {
      const sign = await fetch("/api/events/soundtrack/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type || "audio/mpeg", bytes: file.size }),
      });
      if (!sign.ok) {
        const payload = (await sign.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo preparar la subida");
      }
      const { data } = (await sign.json()) as {
        data: { path: string; target: { url: string; method: string; headers: Record<string, string> } };
      };

      const put = await fetch(data.target.url, {
        method: data.target.method,
        headers: data.target.headers,
        body: file,
      });
      if (!put.ok) throw new Error("No se pudo enviar la canción");

      const save = await fetch("/api/events/soundtrack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: data.path, name: file.name, startMs: 0 }),
      });
      if (!save.ok) {
        const payload = (await save.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "La canción se subió pero no se pudo guardar");
      }

      setStartMs(0);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo subir la canción");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!confirm("¿Quitar la música del recuerdo?")) return;
    stopPlayback();
    setBusy(true);
    await fetch("/api/events/soundtrack", { method: "DELETE" });
    bufferRef.current = null;
    peaksRef.current = null;
    setBusy(false);
    router.refresh();
  };

  const toggle = () => {
    if (playing) {
      stopPlayback();
      return;
    }
    const buffer = bufferRef.current;
    if (!buffer) return;
    // Suena exactamente el trozo que acabará en el video: mismo código.
    playbackRef.current = playMusic(buffer, startMs / 1000, filmSeconds, false);
    setPlaying(true);
    window.setTimeout(() => stopPlayback(), filmSeconds * 1000 + 100);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {!soundtrack ? (
        <div className="rounded-2xl border border-dashed border-cream-300 p-5 text-center">
          <Music className="mx-auto size-6 text-ink-500" aria-hidden="true" />
          <p className="mt-2 font-sans text-sm text-ink-700">
            El video sale en silencio. Ponle la canción de la noche.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            loading={busy}
            onClick={() => inputRef.current?.click()}
            icon={<Upload className="size-4" aria-hidden="true" />}
          >
            Subir un MP3
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 font-sans text-sm text-ink-700">
              <Music className="size-4 shrink-0 text-olive-600" aria-hidden="true" />
              <span className="truncate">{soundtrack.name}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggle}
                disabled={duration === 0}
                icon={
                  playing ? (
                    <Pause className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Play className="size-3.5" aria-hidden="true" />
                  )
                }
              >
                {playing ? "Parar" : "Escuchar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                loading={busy}
              >
                Cambiar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={remove}
                aria-label="Quitar la música"
                icon={<Trash2 className="size-3.5" aria-hidden="true" />}
              />
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={WAVE_WIDTH}
            height={WAVE_HEIGHT}
            className={cn(
              "h-24 w-full cursor-ew-resize touch-none rounded-xl border border-cream-200 bg-cream-50",
              duration === 0 && "cursor-wait"
            )}
            aria-label="Onda de la canción. Arrastra para elegir por dónde empieza."
            onPointerDown={(event) => {
              if (duration === 0) return;
              dragRef.current = true;
              // Capturar el puntero es una comodidad —permite arrastrar fuera
              // del lienzo—, no un requisito. Si el navegador no la concede,
              // lanza, y sin este try el arrastre no llegaba a empezar.
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                /* se arrastra igual, solo que sin salirse */
              }
              stopPlayback();
              moveTo(event.clientX, event.currentTarget);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              moveTo(event.clientX, event.currentTarget);
            }}
            onPointerUp={(event) => {
              if (!dragRef.current) return;
              dragRef.current = false;
              void save(moveTo(event.clientX, event.currentTarget));
            }}
          />

          <p className="font-sans text-xs text-ink-500">
            Suena desde <strong className="tabular-nums">{formatTime(startMs / 1000)}</strong> y
            dura {Math.round(filmSeconds)} s, lo que dura el video. Arrastra sobre la onda para
            buscar el estribillo.
          </p>
        </>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-blush-200/60 px-4 py-3 font-sans text-sm text-blush-500">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Lo primero que va a preguntar. Mejor contestarlo aquí que dejar que lo
          intente y no entienda por qué no funciona. */}
      <p className="font-sans text-xs text-ink-500">
        No se puede tomar el audio de un enlace de YouTube: sus términos no lo permiten y la
        canción tampoco sería tuya para publicarla. Si vas a subir el video a Instagram o TikTok,
        lo mejor es no ponerle música aquí y elegirla allí, donde ya está licenciada.
      </p>
    </div>
  );
}
