import { describe, expect, it } from "vitest";
import {
  FADE_SECONDS,
  MAX_RECAP_SECONDS,
  RECAP_FORMAT_LIST,
  type RecapScene,
  easeOut,
  fadeAt,
  planFilm,
  shotAt,
} from "@/lib/recap-film";
import { outputSize, pickRecordingType } from "@/lib/video";
import { formatDuration } from "@/lib/utils";

const title: RecapScene = { kind: "title", title: "Maya", highlight: "29", dateLabel: "8 de mayo" };
const end: RecapScene = { kind: "end", title: "Gracias por venir", note: "Maya · 29" };
const photo = (url: string): RecapScene => ({ kind: "photo", url, caption: null, author: "Ana" });

describe("planFilm", () => {
  it("encadena los planos sin huecos ni solapes", () => {
    const film = planFilm([title, photo("a"), end]);

    expect(film.shots).toHaveLength(3);
    expect(film.shots[0].start).toBe(0);
    for (let i = 1; i < film.shots.length; i += 1) {
      const previous = film.shots[i - 1];
      expect(film.shots[i].start).toBeCloseTo(previous.start + previous.duration, 6);
    }
    expect(film.seconds).toBeCloseTo(
      film.shots.reduce((sum, shot) => sum + shot.duration, 0),
      6
    );
  });

  it("respeta el tope de duración", () => {
    const many = [title, ...Array.from({ length: 40 }, (_, i) => photo(`p${i}`)), end];
    const film = planFilm(many);

    expect(film.seconds).toBeLessThanOrEqual(MAX_RECAP_SECONDS);
    expect(film.shots.length).toBeLessThan(many.length);
  });

  it("nunca se come el cierre, por muchos planos que sobren", () => {
    // El cierre es el plano que lleva el nombre del evento: recortar por el
    // final no puede significar quedarse sin él.
    const film = planFilm([title, ...Array.from({ length: 40 }, (_, i) => photo(`p${i}`)), end]);
    expect(film.shots.at(-1)?.scene.kind).toBe("end");
  });

  it("un mensaje largo dura más que uno corto", () => {
    const corto = planFilm([{ kind: "quote", text: "Qué fiesta", author: "Ana" }]);
    const largo = planFilm([
      { kind: "quote", text: "Qué fiesta ".repeat(20), author: "Ana" },
    ]);
    expect(largo.seconds).toBeGreaterThan(corto.seconds);
  });

  it("un guion vacío no produce nada, en vez de reventar", () => {
    expect(planFilm([])).toEqual({ shots: [], seconds: 0 });
  });
});

describe("shotAt", () => {
  const film = planFilm([title, photo("a"), end]);

  it("devuelve el plano que toca en cada segundo", () => {
    expect(shotAt(film, 0)?.shot.scene.kind).toBe("title");
    expect(shotAt(film, film.shots[1].start + 0.1)?.shot.scene.kind).toBe("photo");
  });

  it("el avance va de 0 a 1 dentro del plano", () => {
    const shot = film.shots[1];
    expect(shotAt(film, shot.start)?.progress).toBeCloseTo(0, 5);
    expect(shotAt(film, shot.start + shot.duration * 0.5)?.progress).toBeCloseTo(0.5, 5);
  });

  it("en el último fotograma sigue enseñando el cierre", () => {
    // Si devolviera null, el video acabaría en un fundido a negro sin motivo.
    const found = shotAt(film, film.seconds);
    expect(found?.shot.scene.kind).toBe("end");
    expect(found?.progress).toBe(1);
  });

  it("antes del principio no hay nada", () => {
    expect(shotAt(film, -1)).toBeNull();
  });
});

describe("fadeAt", () => {
  it("entra desde cero y sale hasta cero", () => {
    expect(fadeAt(0, 3)).toBeCloseTo(0, 5);
    expect(fadeAt(3, 3)).toBeCloseTo(0, 5);
  });

  it("está a plena opacidad en el centro", () => {
    expect(fadeAt(1.5, 3)).toBe(1);
  });

  it("en un plano cortísimo el fundido no se come el plano entero", () => {
    // Con un fundido fijo, un plano de medio segundo nunca llegaría a verse.
    const duration = FADE_SECONDS;
    expect(fadeAt(duration / 2, duration)).toBeGreaterThan(0.5);
  });
});

describe("easeOut", () => {
  it("va de 0 a 1 y se queda dentro", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(-5)).toBe(0);
    expect(easeOut(5)).toBe(1);
  });

  it("frena al final: avanza más en la primera mitad que en la segunda", () => {
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe("formatos", () => {
  it("todos son verticales o cuadrados, nunca apaisados", () => {
    // Un video apaisado en una historia sale con dos franjas enormes.
    for (const format of RECAP_FORMAT_LIST) {
      expect(format.height).toBeGreaterThanOrEqual(format.width);
    }
  });

  it("todos miden 1080 de ancho, que es lo que piden las redes", () => {
    for (const format of RECAP_FORMAT_LIST) {
      expect(format.width).toBe(1080);
    }
  });
});

describe("outputSize", () => {
  it("no agranda un video que ya es pequeño", () => {
    expect(outputSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it("reduce por el lado mayor y conserva la proporción", () => {
    const size = outputSize(3840, 2160);
    expect(size.width).toBe(1280);
    expect(size.height / size.width).toBeCloseTo(2160 / 3840, 2);
  });

  it("mantiene vertical lo vertical", () => {
    const size = outputSize(1080, 1920);
    expect(size.height).toBeGreaterThan(size.width);
    expect(size.height).toBe(1280);
  });

  it("siempre devuelve lados pares", () => {
    // Muchos codificadores rechazan un lado impar y fallan sin decir por qué.
    for (const [w, h] of [[1921, 1081], [333, 777], [1, 1], [4001, 2999]]) {
      const size = outputSize(w, h);
      expect(size.width % 2).toBe(0);
      expect(size.height % 2).toBe(0);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
  });
});

describe("pickRecordingType", () => {
  it("sin MediaRecorder devuelve null en vez de romper", () => {
    // Es lo que pasa en el servidor y en un navegador viejo: la interfaz tiene
    // que poder preguntarlo sin envolverlo en un try.
    expect(pickRecordingType()).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formatea segundos como m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9_000)).toBe("0:09");
    expect(formatDuration(30_000)).toBe("0:30");
    expect(formatDuration(75_000)).toBe("1:15");
  });

  it("un clip antiguo sin duración no enseña NaN", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
  });
});
