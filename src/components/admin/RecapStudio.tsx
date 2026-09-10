"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, Image as ImageIcon, Share2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RecapReel } from "@/lib/services/recap";
import {
  RECAP_FORMAT_LIST,
  type RecapFormatId,
  RECAP_FORMATS,
  planFilm,
} from "@/lib/recap-film";
import {
  type RecapStage,
  collectImageUrls,
  drawRecapFrame,
  loadRecapImages,
} from "@/lib/recap-render";
import { recordFilm } from "@/lib/recap-recorder";
import type { SoundtrackValue } from "@/components/admin/SoundtrackPicker";
import { audioClockIsHealthy, decodeAudio, playMusic } from "@/lib/soundtrack-audio";
import { pickRecordingType } from "@/lib/video";
import { getTheme } from "@/lib/themes";
import { themeFontVariables } from "@/lib/theme-fonts";
import { cn, fileSlug } from "@/lib/utils";

/**
 * El video del evento para publicar en redes.
 *
 * Se genera en el navegador del anfitrión, no en el servidor. Componer video en
 * servidor significa una cola, una máquina que aguante ffmpeg y una factura por
 * cada evento; aquí el coste es cero y el archivo nunca sale de su equipo.
 *
 * A cambio, grabar cuesta lo que dura el video: `MediaRecorder` graba un canvas
 * en tiempo real, así que veinticinco segundos de video son veinticinco
 * segundos de espera. Por eso hay una vista previa en bucle desde el primer
 * momento: quien mira ya sabe exactamente lo que va a salir antes de esperar.
 *
 * La vista previa se dibuja a un tercio de resolución con el MISMO código que
 * la grabación —todo el dibujo está en fracciones del ancho— y por eso lo que
 * se ve es lo que se obtiene.
 */

/** Ancho de la vista previa. Dibujar 1080 px en bucle calienta el portátil. */
const PREVIEW_WIDTH = 360;

/**
 * Caudal de la grabación.
 *
 * Sale de un límite concreto y no de una tabla de calidad: en México esto viaja
 * por WhatsApp, que **rechaza los videos de más de 16 MB**. A 8 Mb/s un recuerdo
 * de 28 s pesaba 24,5 MB y no se podía mandar. A 4 Mb/s el mismo video ronda los
 * 13 MB y sigue sobrado para 1080p de fotos y degradados, que es lo que hay
 * aquí. Instagram lo va a volver a comprimir de todas formas.
 */
const RECORD_BITRATE = 4_000_000;

type Phase = "listo" | "grabando" | "hecho" | "error";

export function RecapStudio({
  reel,
  soundtrack,
}: {
  reel: RecapReel;
  soundtrack: SoundtrackValue | null;
}) {
  const [format, setFormat] = useState<RecapFormatId>("historia");
  const [phase, setPhase] = useState<Phase>("listo");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; type: string; bytes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  /** Las imágenes viven en un ref y no en el estado: la vista previa las va
   *  incorporando según llegan sin necesidad de un render por cada una. */
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const readyRef = useRef<Promise<void> | null>(null);
  const fontsRef = useRef({ display: "Georgia, serif", body: "system-ui, sans-serif" });
  /** La canción decodificada. En un ref: pesa, y decodificarla en cada render
   *  sería absurdo. Se guarda con su URL para saber si sigue siendo la misma. */
  const musicRef = useRef<{ url: string; buffer: AudioBuffer } | null>(null);
  const [muteWarning, setMuteWarning] = useState<string | null>(null);

  const film = useMemo(() => planFilm(reel.scenes), [reel.scenes]);
  const size = RECAP_FORMATS[format];
  const recordingType = useMemo(() => pickRecordingType(), []);
  const isMp4 = recordingType?.startsWith("video/mp4") ?? false;

  /** El escenario que consume el dibujante, para un ancho dado. */
  const stageFor = (width: number, height: number): RecapStage => ({
    film,
    palette: reel.palette,
    fonts: fontsRef.current,
    images: imagesRef.current,
    width,
    height,
  });

  // Carga de tipografías e imágenes. No toca el estado a propósito: escribe en
  // refs, y el bucle de la vista previa recoge lo que haya en cada fotograma.
  useEffect(() => {
    readyRef.current = (async () => {
      const probe = probeRef.current;
      if (probe) {
        const display = probe.querySelector('[data-font="display"]');
        const body = probe.querySelector('[data-font="body"]');
        if (display && body) {
          fontsRef.current = {
            display: getComputedStyle(display).fontFamily,
            body: getComputedStyle(body).fontFamily,
          };
        }
      }
      // Sin esperar a que las fuentes estén, el canvas dibujaría con la de
      // reserva y el video saldría con otra tipografía que la invitación.
      await document.fonts.ready.catch(() => undefined);
      imagesRef.current = await loadRecapImages(collectImageUrls(reel.scenes));
    })();
  }, [reel.scenes]);

  // Vista previa en bucle.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    // Mientras se graba, la vista previa se para. Grabar es en tiempo real: cada
    // fotograma que la previa le robe al procesador es un fotograma que le falta
    // al archivo, y el resultado sería un video a tirones.
    if (phase === "grabando") return;

    const height = Math.round((PREVIEW_WIDTH * size.height) / size.width);
    canvas.width = PREVIEW_WIDTH;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let frame = 0;
    const started = performance.now();

    const step = () => {
      const t = ((performance.now() - started) / 1000) % Math.max(film.seconds, 0.1);
      drawRecapFrame(context, stageFor(PREVIEW_WIDTH, height), t);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
    // stageFor depende de refs, que no cambian de identidad: reiniciar el bucle
    // solo tiene sentido al cambiar de formato o de guion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film, size.width, size.height, phase]);

  const record = async () => {
    if (!recordingType) {
      setError("Este navegador no puede grabar video. Prueba desde Chrome, Edge o Safari.");
      setPhase("error");
      return;
    }

    setPhase("grabando");
    setProgress(0);
    setError(null);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);

    try {
      await readyRef.current;

      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("El navegador no permite generar el video");

      const stage = stageFor(size.width, size.height);

      // ── Música ────────────────────────────────────────────────────────
      // Se prepara antes de arrancar el grabador: decodificar un MP3 tarda un
      // segundo largo, y hacerlo con la grabación en marcha se comería los
      // primeros fotogramas.
      let music: { track: MediaStreamTrack | null; stop: () => void } | null = null;
      setMuteWarning(null);

      if (soundtrack) {
        try {
          if (musicRef.current?.url !== soundtrack.url) {
            musicRef.current = { url: soundtrack.url, buffer: await decodeAudio(soundtrack.url) };
          }
          // Si el reloj del audio no avanza, el archivo saldría a varias veces
          // la velocidad. Se prefiere un video mudo a un video roto.
          if (await audioClockIsHealthy()) {
            music = playMusic(
              musicRef.current.buffer,
              soundtrack.startMs / 1000,
              film.seconds,
              true
            );
          } else {
            setMuteWarning(
              "El navegador no dejó usar el audio, así que el video salió sin música. Comprueba que este equipo tenga salida de sonido y vuelve a intentarlo."
            );
          }
        } catch {
          setMuteWarning("No se pudo leer la canción, así que el video salió sin música.");
        }
      }

      // Un fotograma dibujado, un fotograma grabado: ver lib/recap-recorder.ts.
      // El porcentaje se toca diez veces por segundo como mucho, porque a
      // treinta fotogramas por segundo un render de React por fotograma le
      // robaría tiempo justo al dibujo que se está grabando.
      let shown = 0;
      const blob = await recordFilm({
        canvas,
        seconds: film.seconds,
        mimeType: recordingType,
        videoBitrate: RECORD_BITRATE,
        audio: music?.track ?? null,
        draw: (t) => drawRecapFrame(context, stage, t),
        onProgress: (ratio) => {
          const percent = Math.floor(ratio * 100);
          if (percent !== shown) {
            shown = percent;
            setProgress(ratio);
          }
        },
      });

      music?.stop();
      const type = recordingType.split(";")[0];

      setResult({ url: URL.createObjectURL(blob), type, bytes: blob.size });
      setProgress(1);
      setPhase("hecho");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo generar el video");
      setPhase("error");
    }
  };

  const filename = `${fileSlug(reel.eventName)}-${format}.${isMp4 ? "mp4" : "webm"}`;

  const share = async () => {
    if (!result) return;
    const response = await fetch(result.url);
    const file = new File([await response.blob()], filename, { type: result.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: reel.eventName }).catch(() => undefined);
    }
  };

  /** Una portada suelta, del mismo dibujo. Sale en un instante y sirve para el
   *  muro, para la miniatura del grupo o para imprimir. */
  const downloadPoster = async () => {
    await readyRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    // Segundo y medio: el primer plano ya entró del todo y todavía no se va.
    drawRecapFrame(context, stageFor(size.width, size.height), 1.5);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileSlug(reel.eventName)}-portada.jpg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const theme = getTheme(reel.theme);

  return (
    <div className="space-y-5">
      {/* Sonda tipográfica: el canvas necesita el NOMBRE real de la familia, y
          la única forma de saberlo es preguntárselo a un elemento que tenga el
          tema puesto. Está fuera de la pantalla y no oculta, porque una fuente
          que no pinta nada no se descarga. */}
      <div
        ref={probeRef}
        data-theme={theme.attribute}
        className={cn(themeFontVariables, "pointer-events-none fixed -left-[9999px] top-0")}
        aria-hidden="true"
      >
        <span data-font="display" className="font-display-script text-2xl">
          Aa
        </span>
        <span data-font="body" className="font-sans text-2xl">
          Aa
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div className="space-y-3">
          <canvas
            ref={previewRef}
            className="w-full rounded-2xl border border-cream-300 bg-forest-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)]"
            aria-label={`Vista previa del video de ${reel.eventName}`}
          />
          <p className="text-center font-sans text-xs text-ink-500">
            {film.seconds.toFixed(0)} s · {size.width}×{size.height}
          </p>
        </div>

        <div className="space-y-5">
          <fieldset>
            <legend className="font-sans text-xs uppercase tracking-[0.18em] text-ink-500">
              Formato
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RECAP_FORMAT_LIST.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormat(option.id)}
                  aria-pressed={format === option.id}
                  className={cn(
                    "rounded-full border px-4 py-2 font-sans text-xs transition-colors",
                    format === option.id
                      ? "border-olive-600 bg-olive-600/10 font-medium text-olive-700"
                      : "border-cream-300 text-ink-700 hover:border-gold-400"
                  )}
                >
                  {option.label}
                  <span className="ml-1.5 opacity-60">{option.ratio}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {reel.photoCount === 0 && (
            <p className="rounded-xl bg-gold-500/12 px-4 py-3 font-sans text-sm text-ink-700">
              Todavía no hay fotos, así que el video sale con el nombre y las cifras. En cuanto
              tus invitados suban fotos, vuelve y genéralo otra vez.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void record()}
              loading={phase === "grabando"}
              icon={<Film className="size-4" aria-hidden="true" />}
            >
              {phase === "grabando" ? `Generando ${Math.round(progress * 100)}%` : "Generar video"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void downloadPoster()}
              icon={<ImageIcon className="size-4" aria-hidden="true" />}
            >
              Descargar portada
            </Button>
          </div>

          {phase === "grabando" && (
            <div className="space-y-2">
              <span className="block h-1 overflow-hidden rounded-full bg-cream-200">
                <span
                  className="block h-full origin-left bg-olive-600 transition-transform duration-150"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </span>
              <p className="font-sans text-xs text-ink-500">
                Se graba en tiempo real, así que tarda lo que dura el video. Deja esta pestaña a la
                vista: si te vas a otra, el navegador deja de dibujar y el video se congela.
              </p>
            </div>
          )}

          {phase === "error" && error && (
            <p className="flex items-start gap-2 rounded-xl bg-blush-200/60 px-4 py-3 font-sans text-sm text-blush-500">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {result && (
            <div className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-4">
              {/* Se dimensiona por el alto y no por el ancho: un 9:16 a lo ancho
                  del panel queda diminuto entre dos franjas negras enormes. */}
              <video
                src={result.url}
                controls
                playsInline
                className="mx-auto max-h-96 w-auto max-w-full rounded-xl bg-forest-900"
              />
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={result.url}
                  download={filename}
                  className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-5 py-2.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Descargar
                </a>

                {typeof navigator !== "undefined" && "canShare" in navigator && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void share()}
                    icon={<Share2 className="size-4" aria-hidden="true" />}
                  >
                    Compartir
                  </Button>
                )}

                <span className="font-sans text-xs text-ink-500">
                  {(result.bytes / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>

              {muteWarning && (
                <p className="flex items-start gap-2 font-sans text-xs text-blush-500">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {muteWarning}
                </p>
              )}

              {!isMp4 && (
                <p className="font-sans text-xs text-ink-500">
                  Tu navegador generó un <code>.webm</code>. Instagram no acepta ese formato:
                  ábrelo desde Chrome o Safari actualizado y vuelve a generarlo para obtener un
                  <code> .mp4</code>.
                </p>
              )}
            </div>
          )}

          {!soundtrack && (
            <p className="font-sans text-xs text-ink-500">
              Sin música puesta, el video sale en silencio. Para Instagram o TikTok eso suele ser
              lo mejor: la canción que eliges allí ya está licenciada y no te tumba el alcance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
