/**
 * Comprime una foto en el navegador antes de subirla.
 *
 * No es una optimización menor. Un móvil actual saca fotos de 4 a 12 MB, y
 * quien sube desde una fiesta suele estar con datos móviles y mala cobertura:
 * mandar el original significa esperas larguísimas y subidas que se cortan.
 * A 1600 px de lado mayor y calidad 0.82 la foto baja a unos 300 KB y sigue
 * viéndose bien en cualquier pantalla.
 *
 * Además baja el coste de almacenamiento y de descarga, que es lo que se paga.
 */

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  type: string;
}

const MAX_SIDE = 1600;
const QUALITY = 0.82;

/**
 * Decodifica el archivo respetando la orientación EXIF. Sin eso, las fotos
 * tomadas en vertical con algunos móviles salen acostadas.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari antiguo no acepta las opciones: se cae a <img>, que aplica la
    // orientación por su cuenta al pintar.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const source = await decode(file);
  const sourceWidth = "width" in source ? source.width : 0;
  const sourceHeight = "height" in source ? source.height : 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("No se pudo leer la imagen");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("El navegador no permite procesar la imagen");
  }

  context.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // Siempre JPEG: es una foto de fiesta, y un PNG del mismo tamaño pesa
    // varias veces más sin verse mejor.
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );

  if (!blob) {
    throw new Error("No se pudo comprimir la imagen");
  }

  return { blob, width, height, type: "image/jpeg" };
}
