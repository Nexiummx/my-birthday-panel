/**
 * Comprime un video en el navegador antes de subirlo.
 *
 * Es el mismo problema que las fotos, multiplicado. Un móvil actual graba a
 * 1080p o 4K con 15–50 MB por cada diez segundos: subir el original desde la
 * red de un salón de fiestas no es lento, es imposible. Aquí el clip se vuelve
 * a codificar a 720p con un caudal fijo, y treinta segundos acaban pesando unos
 * pocos MB.
 *
 * Cómo funciona: el video se reproduce, cada fotograma se pinta en un canvas
 * escalado, y `MediaRecorder` graba ese canvas junto con el audio del original.
 * Eso significa que comprimir **cuesta lo que dura el clip** —veinte segundos de
 * video, veinte segundos de espera—, y por eso el tope de treinta segundos no es
 * solo una decisión de producto: es también lo que hace que la espera sea
 * tolerable. La alternativa sería un transcodificador en WebAssembly de decenas
 * de megas que además hay que descargar antes de poder usarlo.
 *
 * El audio se enruta por WebAudio hacia el grabador y NO hacia los altavoces:
 * quien sube un clip no tiene por qué oírlo entero a todo volumen.
 *
 * No se recorta la imagen: un clip vertical sigue siendo vertical. Solo se
 * reduce de tamaño.
 */

/** Tope de duración. Lo que pasa de aquí se graba solo hasta este punto. */
export const VIDEO_MAX_SECONDS = 30;

/** Lado mayor del video de salida. 720p es de sobra para un móvil. */
const MAX_SIDE = 1280;

/** Caudales fijos. Con 720p dan una imagen limpia sin dispararse de tamaño. */
const VIDEO_BITRATE = 2_200_000;
const AUDIO_BITRATE = 96_000;

const FPS = 30;

/** Calidad del fotograma de portada. Es una miniatura: no necesita más. */
const POSTER_QUALITY = 0.78;

/** Cuánto se observa el reloj del audio antes de fiarse de él. Ver attachAudio. */
const AUDIO_CLOCK_CHECK_MS = 150;

/**
 * Si el navegador no sabe recodificar, se deja pasar el original solo si ya
 * es pequeño. Más que esto no llega desde una fiesta.
 */
const PASSTHROUGH_MAX_BYTES = 25 * 1024 * 1024;

export interface CompressedVideo {
  blob: Blob;
  type: string;
  width: number;
  height: number;
  durationMs: number;
  /** Fotograma de portada. Sin él la galería tendría que descargar el video. */
  poster: { blob: Blob; type: string; width: number; height: number };
  /** true si el navegador no pudo recodificar y se subió el archivo original. */
  passthrough: boolean;
}

export interface VideoProbe {
  seconds: number;
  width: number;
  height: number;
  /** Lo que de verdad se va a subir, ya con el tope aplicado. */
  usedSeconds: number;
}

/* ─────────────────────────── Soporte del navegador ─────────────────────── */

/** Contenedores por orden de preferencia. MP4 primero: lo abre cualquier cosa. */
const CANDIDATE_TYPES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4",
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

export function pickRecordingType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function canCompressVideo(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    pickRecordingType() !== null
  );
}

/** El tipo que acaba teniendo el archivo, ya sin los parámetros de códec. */
function containerOf(mimeType: string): string {
  return mimeType.split(";")[0];
}

/* ──────────────────────────────── Utilidades ───────────────────────────── */

function once(target: EventTarget, event: string, errorEvent = "error"): Promise<void> {
  return new Promise((resolve, reject) => {
    const onDone = () => {
      target.removeEventListener(event, onDone);
      target.removeEventListener(errorEvent, onFail);
      resolve();
    };
    const onFail = () => {
      target.removeEventListener(event, onDone);
      target.removeEventListener(errorEvent, onFail);
      reject(new Error("El navegador no pudo leer el video"));
    };
    target.addEventListener(event, onDone, { once: true });
    target.addEventListener(errorEvent, onFail, { once: true });
  });
}

/**
 * Algunos contenedores (webm grabado por el propio navegador, sobre todo)
 * declaran duración infinita hasta que se busca hasta el final. Este es el
 * truco conocido para forzar que la calculen.
 */
async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;

  await new Promise<void>((resolve) => {
    const onUpdate = () => {
      if (Number.isFinite(video.duration)) {
        video.removeEventListener("timeupdate", onUpdate);
        resolve();
      }
    };
    video.addEventListener("timeupdate", onUpdate);
    video.currentTime = 1e6;
    // Red de seguridad: si el navegador no responde, se sigue con lo que haya.
    setTimeout(() => {
      video.removeEventListener("timeupdate", onUpdate);
      resolve();
    }, 3000);
  });

  video.currentTime = 0;
  return Number.isFinite(video.duration) ? video.duration : 0;
}

/** Dimensiones de salida. Pares: muchos codificadores rechazan lados impares. */
export function outputSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

async function loadVideoElement(file: File): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Fuera de la vista pero no display:none: Safari no decodifica lo que no está
  // en el árbol de renderizado, y sin decodificar no hay fotogramas que copiar.
  video.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0";
  document.body.appendChild(video);

  try {
    await once(video, "loadedmetadata");
  } catch (error) {
    video.remove();
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    video,
    revoke: () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    },
  };
}

/** Lee duración y tamaño sin comprimir nada, para poder avisar antes de esperar. */
export async function probeVideo(file: File): Promise<VideoProbe> {
  const { video, revoke } = await loadVideoElement(file);
  try {
    const seconds = await resolveDuration(video);
    return {
      seconds,
      width: video.videoWidth,
      height: video.videoHeight,
      usedSeconds: Math.min(seconds, VIDEO_MAX_SECONDS),
    };
  } finally {
    revoke();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
      type,
      quality
    )
  );
}

/* ──────────────────────────────── Compresión ───────────────────────────── */

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<CompressedVideo> {
  const { video, revoke } = await loadVideoElement(file);

  try {
    const duration = await resolveDuration(video);
    const target = Math.min(duration || VIDEO_MAX_SECONDS, VIDEO_MAX_SECONDS);
    const size = outputSize(video.videoWidth || 720, video.videoHeight || 1280);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("El navegador no permite procesar el video");
    }

    // La portada se saca antes de grabar: hay que mover el cabezal, y hacerlo
    // después obligaría a esperar una segunda vez.
    const poster = await capturePoster(video, canvas, context, target);

    const mimeType = pickRecordingType();
    if (!mimeType) {
      return passthrough(file, poster, target);
    }

    video.currentTime = 0;
    await once(video, "seeked");

    const stream = canvas.captureStream(FPS);
    const audio = await attachAudio(video, stream);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(1000);

    // Se reproduce en silencio y solo después se quita el mute: el navegador
    // exige `muted` para dejar arrancar sin gesto, y una vez que el audio va por
    // el grafo de WebAudio quitarlo no lo saca por los altavoces.
    //
    // Sin grafo NO se quita: ahí el elemento conserva su propia salida, y
    // quitarlo pondría la fiesta a todo volumen en el móvil de quien sube.
    await video.play();
    if (audio) video.muted = false;

    await drawUntil(video, context, canvas, target, onProgress);

    video.pause();
    recorder.stop();
    await finished;

    for (const track of stream.getTracks()) track.stop();
    await audio?.context.close().catch(() => undefined);

    const type = containerOf(mimeType);
    const blob = new Blob(chunks, { type });

    // Un archivo vacío significa que el grabador no recibió nada: mejor decirlo
    // que subir cero bytes y descubrirlo al reproducir.
    if (blob.size === 0) {
      throw new Error("El navegador no pudo procesar este video");
    }

    return {
      blob,
      type,
      width: size.width,
      height: size.height,
      // La duración sale de dónde se quedó el original, no de los metadatos del
      // archivo grabado: los contenedores que escribe MediaRecorder mienten a
      // menudo —el WebM ni siquiera trae duración— y esta cifra es la que ve el
      // anfitrión en el panel y la que dura el clip dentro del recuerdo.
      durationMs: Math.round(Math.min(video.currentTime || target, target) * 1000),
      poster,
      passthrough: false,
    };
  } finally {
    revoke();
  }
}

/** Fotograma de portada, tomado a un décimo del clip y nunca del primer frame:
 *  el primero suele ser el suelo o un borrón del momento de pulsar grabar. */
async function capturePoster(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  target: number
): Promise<CompressedVideo["poster"]> {
  const at = Math.min(Math.max(target * 0.1, 0.2), 2);
  video.currentTime = at;
  try {
    await once(video, "seeked");
  } catch {
    /* si no puede buscar, se pinta lo que haya cargado */
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await toBlob(canvas, "image/jpeg", POSTER_QUALITY);
  return { blob, type: "image/jpeg", width: canvas.width, height: canvas.height };
}

/**
 * Conecta el audio del original al grabador. Si falla, el clip sale mudo, que
 * es mucho mejor que no poder subirlo.
 *
 * Antes de conectar nada se comprueba que el reloj del audio avance de verdad,
 * y no es una precaución teórica: medido en un Chrome sin dispositivo de salida,
 * `currentTime` avanzaba 0,01 s por cada 2 s de reloj. Con un reloj así el
 * grabador escribe una pista de audio con marcas de tiempo muy por debajo de lo
 * real, y el contenedor MP4 —que saca de ahí su duración— produce un clip que se
 * reproduce a tres veces la velocidad. Se comprobó: la imagen llegaba entera,
 * pero cinco segundos se veían en menos de dos.
 *
 * Un clip mudo es un clip que sirve. Uno acelerado, no.
 */
async function attachAudio(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<{ context: AudioContext } | null> {
  let context: AudioContext | null = null;
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    context = new AudioContextClass();
    await context.resume().catch(() => undefined);

    const before = context.currentTime;
    await new Promise((resolve) => setTimeout(resolve, AUDIO_CLOCK_CHECK_MS));
    // Con holgura: basta con que avance; lo que se descarta es un reloj parado.
    if (context.currentTime - before < (AUDIO_CLOCK_CHECK_MS / 1000) * 0.4) {
      await context.close().catch(() => undefined);
      return null;
    }

    // El source se crea al final a propósito: en cuanto existe, el elemento deja
    // de sonar por su cuenta, y si tuviéramos que abandonar después de crearlo
    // el clip se quedaría sin audio por ninguna razón.
    const source = context.createMediaElementSource(video);
    const destination = context.createMediaStreamDestination();
    source.connect(destination);

    const [track] = destination.stream.getAudioTracks();
    if (track) stream.addTrack(track);
    return { context };
  } catch {
    await context?.close().catch(() => undefined);
    return null;
  }
}

/**
 * Copia fotogramas al canvas hasta llegar al tope o al final del video.
 *
 * Hay dos relojes moviendo esto y no uno, y el segundo no es redundancia:
 *
 *   requestVideoFrameCallback  dispara una vez por fotograma decodificado, así
 *                              que copia cada uno exactamente una vez. Es el
 *                              bueno... mientras la pestaña esté a la vista.
 *   setInterval                sigue vivo cuando no lo está.
 *
 * Sin el segundo, cambiar de aplicación a mitad de la subida —que es lo que
 * hace cualquiera en una fiesta— deja el bucle esperando un fotograma que ya no
 * va a llegar, y la barra se queda clavada en un porcentaje para siempre. Se
 * comprobó: un clip de doce segundos se paró en el 46 % y no volvió.
 *
 * Dibujar dos veces el mismo fotograma no rompe nada; no dibujar ninguno, sí.
 *
 * El vigía de tiempo total es la última red: si ni siquiera el intervalo avanza
 * el video, se corta y se sube lo que haya, porque un clip corto es un clip y
 * una espera infinita no es nada.
 */
function drawUntil(
  video: HTMLVideoElement,
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  target: number,
  onProgress?: (ratio: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const started = Date.now();
    /** Margen sobre la duración: cubre un móvil lento sin dejar colgado a nadie. */
    const limit = (target * 2 + 15) * 1000;

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      video.removeEventListener("ended", finish);
      resolve();
    };

    const step = () => {
      if (done) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(1, video.currentTime / target));

      if (video.currentTime >= target || video.ended || Date.now() - started > limit) {
        finish();
        return;
      }
      request();
    };

    const withFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const request = () => {
      if (done) return;
      if (withFrameCallback) video.requestVideoFrameCallback(() => step());
      else requestAnimationFrame(() => step());
    };

    // Los navegadores limitan setInterval a una vez por segundo en una pestaña
    // oculta, pero no lo paran: eso basta para que el bucle llegue al final.
    const timer = setInterval(step, 250);

    video.addEventListener("ended", finish, { once: true });
    request();
  });
}

/** Sin grabador no hay compresión: solo se acepta lo que ya venga pequeño. */
async function passthrough(
  file: File,
  poster: CompressedVideo["poster"],
  target: number
): Promise<CompressedVideo> {
  if (file.size > PASSTHROUGH_MAX_BYTES) {
    throw new Error(
      "Este navegador no puede comprimir video y el archivo es muy grande. Prueba desde Chrome, Edge o Safari actualizado."
    );
  }

  const size = { width: 0, height: 0 };
  return {
    blob: file,
    type: file.type || "video/mp4",
    width: poster.width || size.width,
    height: poster.height || size.height,
    durationMs: Math.round(target * 1000),
    poster,
    passthrough: true,
  };
}
