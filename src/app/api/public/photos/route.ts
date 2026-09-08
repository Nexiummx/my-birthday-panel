import { handleError, ok, parseBody } from "@/lib/api";
import { registerPhoto, resolveUploadContext } from "@/lib/services/photos";
import { registerPhotoSchema } from "@/lib/validations";

/** Paso 2: el archivo ya está arriba, se da de alta la foto. */
export async function POST(request: Request) {
  try {
    const input = await parseBody(request, registerPhotoSchema);
    const context = await resolveUploadContext(input);
    const photo = await registerPhoto(context, input);
    return ok({ id: photo.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}
