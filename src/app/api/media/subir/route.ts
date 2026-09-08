import { NextResponse } from "next/server";
import { storageIsLocal, verifyLocalPath, writeLocalFile } from "@/lib/storage";
import { MAX_PHOTO_BYTES } from "@/lib/services/photos";

/**
 * Recibe el archivo cuando el almacenamiento es el local de desarrollo.
 *
 * En producción esta ruta no hace nada: allí el navegador sube directo a
 * Supabase con una URL firmada y el archivo nunca pasa por aquí. Existe para
 * poder probar el flujo completo sin credenciales.
 *
 * La firma es obligatoria: sin ella cualquiera podría escribir en el disco del
 * servidor. La emite lib/storage al autorizar la subida.
 */
export async function PUT(request: Request) {
  if (!storageIsLocal()) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const signature = url.searchParams.get("firma");

  if (!path || !signature || !verifyLocalPath(path, signature)) {
    return NextResponse.json({ error: "Subida no autorizada" }, { status: 403 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Archivo fuera de rango" }, { status: 413 });
  }

  await writeLocalFile(path, body);
  return NextResponse.json({ ok: true });
}
