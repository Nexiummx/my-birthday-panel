import { NextResponse } from "next/server";
import { readLocalFile, storageIsLocal } from "@/lib/storage";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

/** Cabeceras comunes. El nombre del archivo lleva un identificador aleatorio y
 *  nunca se reescribe, así que puede cachearse para siempre. */
function headersFor(type: string): Record<string, string> {
  return {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    // El generador del video para redes dibuja estas fotos en un canvas, y un
    // canvas contaminado no se puede grabar. En producción lo sirve el CDN del
    // almacenamiento, que ya manda esta cabecera.
    "Access-Control-Allow-Origin": "*",
    "Accept-Ranges": "bytes",
  };
}

/**
 * Sirve las fotos y los videos guardados por el controlador local de desarrollo.
 *
 * En producción no se usa: allí las URLs apuntan directo al almacenamiento y
 * las sirve su CDN.
 *
 * Atiende peticiones por rango porque los videos lo necesitan: sin 206, Safari
 * ni siquiera empieza a reproducir, y en el resto de navegadores no se puede
 * saltar a la mitad del clip.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!storageIsLocal()) {
    return new NextResponse("No disponible", { status: 404 });
  }

  const { path } = await params;
  const extension = path[path.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[extension];

  if (!type) {
    return new NextResponse("Tipo no permitido", { status: 415 });
  }

  let file: Buffer;
  try {
    // resolveLocalPath, dentro de readLocalFile, corta cualquier ".." de la URL.
    file = await readLocalFile(path.join("/"));
  } catch {
    return new NextResponse("No encontrada", { status: 404 });
  }

  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);

  if (match) {
    const size = file.byteLength;
    // "bytes=-500" pide los últimos 500; "bytes=100-" pide de 100 al final.
    const suffix = match[1] === "";
    const start = suffix ? Math.max(0, size - Number(match[2] || 0)) : Number(match[1]);
    const end = suffix || match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);

    if (!Number.isFinite(start) || start > end || start >= size) {
      return new NextResponse("Rango inválido", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const slice = file.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        ...headersFor(type),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(slice.byteLength),
      },
    });
  }

  return new NextResponse(new Uint8Array(file), { headers: headersFor(type) });
}
