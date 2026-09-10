/**
 * Decodificar, dibujar y sonar la música del recuerdo, en el navegador.
 *
 * Está aparte porque lo usan dos pantallas que no se conocen entre ellas: el
 * editor —que necesita la forma de onda y una escucha— y el generador del
 * video —que necesita una pista de audio para el grabador—. Y sobre todo,
 * porque el trozo que se oye al probar tiene que ser **exactamente** el que
 * acaba en el archivo. Con dos implementaciones eso dura hasta el primer
 * cambio.
 */

/** Cuánto dura el fundido al entrar y al salir. Un corte seco suena a error. */
const FADE_SECONDS = 0.9;

let sharedContext: AudioContext | null = null;

/** Un solo AudioContext para todo: los navegadores limitan cuántos se pueden
 *  abrir, y abrir uno por cada vez que se mueve un control los agota. */
export function audioContext(): AudioContext {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Este navegador no puede reproducir audio");
  }
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContextClass();
  }
  return sharedContext;
}

export async function decodeAudio(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No se pudo descargar la canción");
  }
  const bytes = await response.arrayBuffer();
  // decodeAudioData se queda con el ArrayBuffer, así que no se puede reutilizar.
  return audioContext().decodeAudioData(bytes);
}

/**
 * Picos para dibujar la onda: el máximo absoluto de cada tramo.
 *
 * Máximo y no media a propósito. La media de una canción es casi plana y todas
 * se parecen; el máximo deja ver dónde entra la batería, que es justo lo que
 * alguien busca cuando arrastra para encontrar el estribillo.
 */
export function peaksFrom(buffer: AudioBuffer, count: number): Float32Array {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / count));
  const peaks = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    let max = 0;
    const start = i * per;
    const end = Math.min(start + per, data.length);
    // De 16 en 16: con canciones largas, mirar muestra a muestra bloquea el
    // hilo, y para un dibujo de 900 px no cambia nada.
    for (let j = start; j < end; j += 16) {
      const value = Math.abs(data[j]);
      if (value > max) max = value;
    }
    peaks[i] = max;
  }
  return peaks;
}

export interface MusicPlayback {
  /** Pista lista para añadir al grabador. NULL si solo se está escuchando. */
  track: MediaStreamTrack | null;
  stop: () => void;
}

/**
 * Suena `seconds` de la canción desde `startSec`, con fundidos.
 *
 * `toStream` decide a dónde va: al grabador —y entonces NO se oye por los
 * altavoces, que es lo que se quiere mientras se genera el video— o a los
 * altavoces, para escuchar el trozo elegido.
 *
 * El bucle está siempre puesto: si alguien sube un fragmento de diez segundos
 * para un video de veintiocho, es mejor que se repita a que el video acabe en
 * silencio.
 */
export function playMusic(
  buffer: AudioBuffer,
  startSec: number,
  seconds: number,
  toStream: boolean
): MusicPlayback {
  const context = audioContext();
  void context.resume().catch(() => undefined);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = Math.min(startSec, Math.max(0, buffer.duration - 0.1));
  source.loopEnd = buffer.duration;

  const gain = context.createGain();
  const now = context.currentTime;
  const fade = Math.min(FADE_SECONDS, seconds / 4);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + fade);
  gain.gain.setValueAtTime(1, now + seconds - fade);
  gain.gain.linearRampToValueAtTime(0, now + seconds);

  source.connect(gain);

  let destination: MediaStreamAudioDestinationNode | null = null;
  if (toStream) {
    destination = context.createMediaStreamDestination();
    gain.connect(destination);
  } else {
    gain.connect(context.destination);
  }

  source.start(now, source.loopStart, seconds);

  return {
    track: destination?.stream.getAudioTracks()[0] ?? null,
    stop: () => {
      try {
        source.stop();
      } catch {
        /* ya había terminado */
      }
      source.disconnect();
      gain.disconnect();
    },
  };
}

/**
 * ¿Avanza el reloj del audio como el de pared?
 *
 * Medido en un Chrome sin dispositivo de salida, `currentTime` avanzaba 0,01 s
 * por cada 2 s reales. Con un reloj así el grabador fecha mal la pista y el MP4
 * sale a tres veces la velocidad: la imagen llega entera, pero veintiocho
 * segundos se ven en menos de diez. Antes de mezclar música, se comprueba.
 */
export async function audioClockIsHealthy(): Promise<boolean> {
  let probe: OscillatorNode | null = null;
  let silence: GainNode | null = null;

  try {
    const context = audioContext();
    await context.resume().catch(() => undefined);

    // Hay que tirar del grafo para medirlo. Chrome no arranca el hilo de audio
    // hasta que algo está conectado a la salida, así que medir "en frío" daba
    // un reloj parado en equipos perfectamente sanos — y eso habría dejado sin
    // música todos los videos, en silencio y sin explicación.
    // La sonda va a volumen cero: se conecta para que el reloj corra, no para
    // que suene.
    probe = context.createOscillator();
    silence = context.createGain();
    silence.gain.value = 0;
    probe.connect(silence);
    silence.connect(context.destination);
    probe.start();

    const before = context.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 150));
    return context.currentTime - before >= 0.06;
  } catch {
    return false;
  } finally {
    try {
      probe?.stop();
      probe?.disconnect();
      silence?.disconnect();
    } catch {
      /* la sonda ya no estaba */
    }
  }
}
