/**
 * Graba una animación de canvas a un archivo de video.
 *
 * Existe aparte del dibujo porque el problema que resuelve no es de dibujo sino
 * de tiempo, y es el que hacía que el video saliera mal.
 *
 * ## Qué pasaba antes
 *
 * `canvas.captureStream(30)` deja que el navegador **muestree** el canvas cuando
 * le viene bien. Si el dibujo de un fotograma tarda más de 33 ms —a 1080×1920,
 * con una foto grande derivando y grano encima, tarda— el navegador graba dos
 * veces el mismo fotograma; si tarda menos, se salta alguno. El resultado es
 * exactamente lo que se veía: trozos trabados y transiciones que parecen
 * empalmarse, porque el instante que se graba no es el que se dibujó.
 *
 * Y como el reloj de la animación era el reloj de pared, un tirón del equipo no
 * ralentizaba el video: lo hacía **saltar** hacia adelante.
 *
 * ## Cómo se graba ahora
 *
 * Un fotograma dibujado es un fotograma grabado, ni uno más ni uno menos:
 *
 *   1. El tiempo de la animación es `fotograma / fps`, no el reloj. La película
 *      se recorre entera, en orden, pase lo que pase.
 *   2. `captureStream(0)` apaga el muestreo automático y `requestFrame()`
 *      entrega el fotograma recién dibujado, una vez.
 *   3. El ritmo se marca esperando a que el reloj alcance al fotograma. Si el
 *      equipo va sobrado, espera; si va justo, no se salta nada, solo tarda un
 *      poco más. Se marca contra el reloj y no a ciegas porque `MediaRecorder`
 *      fecha cada fotograma cuando le llega: sin marcar el paso, un equipo
 *      rápido produciría un video acelerado.
 *
 * El precio es que grabar sigue costando lo que dura el video. No hay forma de
 * evitarlo sin un codificador propio, y a cambio el archivo sale igual en
 * cualquier equipo.
 */

export interface RecordFilmOptions {
  canvas: HTMLCanvasElement;
  /** Pinta el fotograma que corresponde al segundo `t`. */
  draw: (t: number) => void;
  seconds: number;
  mimeType: string;
  videoBitrate: number;
  fps?: number;
  /** Pista de audio ya lista, si el recuerdo lleva música. */
  audio?: MediaStreamTrack | null;
  onProgress?: (ratio: number) => void;
}

const DEFAULT_FPS = 30;

/** Espera de verdad, también con la pestaña oculta (ahí rAF no dispara). */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

export async function recordFilm({
  canvas,
  draw,
  seconds,
  mimeType,
  videoBitrate,
  fps = DEFAULT_FPS,
  audio = null,
  onProgress,
}: RecordFilmOptions): Promise<Blob> {
  // 0 = sin muestreo automático: solo se graba lo que se entregue a mano.
  const stream = canvas.captureStream(0);
  const [videoTrack] = stream.getVideoTracks();
  const capture = videoTrack as CanvasCaptureMediaStreamTrack;

  if (audio) stream.addTrack(audio);

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: videoBitrate,
    ...(audio ? { audioBitsPerSecond: 128_000 } : {}),
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const total = Math.max(1, Math.round(seconds * fps));

  // El primer fotograma va antes de arrancar: si no, el video abre con el
  // canvas en blanco durante una décima.
  draw(0);
  recorder.start(1000);
  capture.requestFrame();

  const started = performance.now();

  for (let frame = 1; frame <= total; frame += 1) {
    const due = started + (frame * 1000) / fps;
    const ahead = due - performance.now();
    if (ahead > 1) await wait(ahead);

    draw(frame / fps);
    capture.requestFrame();
    onProgress?.(frame / total);
  }

  recorder.stop();
  await finished;
  for (const track of stream.getTracks()) track.stop();

  const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
  if (blob.size === 0) {
    throw new Error("El navegador no devolvió ningún video");
  }
  return blob;
}
