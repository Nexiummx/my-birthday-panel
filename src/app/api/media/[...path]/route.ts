import { NextResponse } from "next/server";
import { readLocalFile, storageIsLocal } from "@/lib/storage";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Sirve las fotos guardadas por el controlador local de desarrollo.
 *
 * En producción no se usa: allí las URLs apuntan directo al almacenamiento y
 * las sirve su CDN. Aquí se marca la respuesta como inmutable porque el nombre
 * del archivo lleva un identificador aleatorio y nunca se reescribe.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!storageIsLocal()) {
    return new NextResponse("No disponible", { status: 404 });
  }

  const { path } = await params;
  const extension = path[path.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[extension];

  if (!type) {
    return new NextResponse("Tipo no permitido", { status: 415 });
  }

  try {
    // resolveLocalPath, dentro de readLocalFile, corta cualquier ".." de la URL.
    const file = await readLocalFile(path.join("/"));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("No encontrada", { status: 404 });
  }
}
