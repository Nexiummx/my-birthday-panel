import { afterEach, describe, expect, it } from "vitest";
import {
  belongsToEvent,
  eventFolder,
  mediaPath,
  storagePrefix,
} from "@/lib/storage-paths";

const entorno = { ...process.env };
afterEach(() => {
  process.env = { ...entorno };
});

describe("storagePrefix", () => {
  it("separa producción de los despliegues de vista previa", () => {
    // Sin esto, un preview de Vercel escribe en el mismo sitio que la fiesta
    // de un cliente: las variables se copian a los previews sin más.
    process.env.VERCEL_ENV = "production";
    expect(storagePrefix()).toBe("prod");

    process.env.VERCEL_ENV = "preview";
    expect(storagePrefix()).toBe("preview");
  });

  it("fuera de Vercel trabaja en dev", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.STORAGE_PREFIX;
    expect(storagePrefix()).toBe("dev");
  });

  it("se puede forzar, y sin barras sueltas", () => {
    process.env.STORAGE_PREFIX = "/staging/";
    expect(storagePrefix()).toBe("staging");
  });
});

describe("mediaPath", () => {
  it("guarda cada tipo en su carpeta", () => {
    process.env.STORAGE_PREFIX = "prod";
    expect(mediaPath("ev1", "fotos", "a.jpg")).toBe("prod/eventos/ev1/fotos/a.jpg");
    expect(mediaPath("ev1", "videos", "a.mp4")).toBe("prod/eventos/ev1/videos/a.mp4");
    expect(mediaPath("ev1", "musica", "a.mp3")).toBe("prod/eventos/ev1/musica/a.mp3");
  });

  it("empareja el clip con su portada por el nombre", () => {
    process.env.STORAGE_PREFIX = "prod";
    const id = "8f14e45f";
    // Mismo uuid, distinta carpeta: la relación no se guarda en ningún sitio.
    expect(mediaPath("ev1", "videos", `${id}.mp4`)).toBe("prod/eventos/ev1/videos/8f14e45f.mp4");
    expect(mediaPath("ev1", "portadas", `${id}.jpg`)).toBe("prod/eventos/ev1/portadas/8f14e45f.jpg");
  });

  it("todo lo de un evento cuelga de su carpeta", () => {
    process.env.STORAGE_PREFIX = "prod";
    for (const area of ["fotos", "videos", "portadas", "musica"] as const) {
      expect(mediaPath("ev1", area, "x.bin").startsWith(`${eventFolder("ev1")}/`)).toBe(true);
    }
  });
});

describe("belongsToEvent", () => {
  it("acepta lo que es de ese evento", () => {
    process.env.STORAGE_PREFIX = "prod";
    expect(belongsToEvent("prod/eventos/ev1/fotos/a.jpg", "ev1")).toBe(true);
  });

  it("rechaza el archivo de otro evento", () => {
    // Este es el caso que importa: sin la comprobación se podría colgar de tu
    // evento una foto que pertenece al de otro cliente.
    process.env.STORAGE_PREFIX = "prod";
    expect(belongsToEvent("prod/eventos/ev2/fotos/a.jpg", "ev1")).toBe(false);
  });

  it("no se deja engañar por un prefijo parecido", () => {
    process.env.STORAGE_PREFIX = "prod";
    expect(belongsToEvent("prod/eventos/ev12/fotos/a.jpg", "ev1")).toBe(false);
  });

  it("rechaza las rutas que intentan salirse", () => {
    process.env.STORAGE_PREFIX = "prod";
    expect(belongsToEvent("prod/eventos/ev1/../ev2/fotos/a.jpg", "ev1")).toBe(false);
  });

  it("sigue aceptando el orden anterior, del mismo evento", () => {
    // Durante un despliegue puede haber una subida firmada por el código viejo
    // y registrada por el nuevo. Sigue acotada al mismo evento.
    process.env.STORAGE_PREFIX = "prod";
    expect(belongsToEvent("eventos/ev1/abc.jpg", "ev1")).toBe(true);
    expect(belongsToEvent("eventos/ev2/abc.jpg", "ev1")).toBe(false);
  });
});
