import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

/**
 * Almacenamiento de archivos, detrás de una interfaz estrecha.
 *
 * Las fotos NO pasan por el servidor de la aplicación. El navegador las sube
 * directo al almacenamiento con una URL firmada, y eso no es un lujo: en Vercel
 * el cuerpo de una función serverless está limitado a 4.5 MB, así que proxear
 * las fotos rompería con la primera foto de un móvil moderno.
 *
 * Hay dos controladores:
 *
 *   supabase → producción. Ya se paga Supabase para la base, así que no entra
 *              un proveedor nuevo. Se habla con su API REST por fetch en vez de
 *              con su SDK: son cuatro llamadas y evita una dependencia.
 *   local    → desarrollo. Escribe en .uploads/ y sirve por /api/media. Existe
 *              para poder probar el flujo completo sin credenciales, y de paso
 *              obliga a que la interfaz sea real y no decorativa.
 *
 * Cambiar de proveedor es escribir un tercer controlador aquí. Nada fuera de
 * este archivo sabe dónde viven los archivos.
 */

export interface UploadTarget {
  /** A dónde manda el navegador el archivo. */
  url: string;
  method: "PUT" | "POST";
  headers: Record<string, string>;
}

export interface StorageDriver {
  name: "supabase" | "local";
  createUpload(path: string, contentType: string): Promise<UploadTarget>;
  publicUrl(path: string): string;
  remove(paths: string[]): Promise<void>;
}

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "fotos";

/* ────────────────────────────── Supabase ────────────────────────────── */

const supabaseDriver: StorageDriver = {
  name: "supabase",

  async createUpload(path, contentType) {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase no firmó la subida (${response.status})`);
    }

    // Devuelve una ruta relativa que ya lleva el token dentro.
    const { url } = (await response.json()) as { url: string };

    return {
      url: `${SUPABASE_URL}/storage/v1${url}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
    };
  },

  publicUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  },

  async remove(paths) {
    if (paths.length === 0) return;
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: paths }),
    });
  },
};

/* ──────────────────────────────── Local ─────────────────────────────── */

/** Raíz de los archivos en desarrollo. Fuera de public/: no se sirve sola. */
const LOCAL_ROOT = join(process.cwd(), ".uploads");

/**
 * Impide que un `path` con ".." escriba fuera de .uploads. La ruta la construye
 * el servidor, pero esta comprobación es barata y el día que alguien la
 * construya con datos del cliente ya está puesta.
 */
export function resolveLocalPath(path: string): string {
  const full = normalize(join(LOCAL_ROOT, path));
  if (!full.startsWith(LOCAL_ROOT)) {
    throw new Error("Ruta de archivo fuera del almacenamiento");
  }
  return full;
}

/** Firma que autoriza una subida local. Sin ella /api/media aceptaría cualquiera. */
export function signLocalPath(path: string): string {
  const secret = process.env.AUTH_SECRET ?? "desarrollo";
  return createHmac("sha256", secret).update(path).digest("hex").slice(0, 32);
}

export function verifyLocalPath(path: string, signature: string): boolean {
  const expected = Buffer.from(signLocalPath(path));
  const received = Buffer.from(signature);
  // Longitudes distintas hacen que timingSafeEqual lance en vez de devolver
  // false, así que se comprueba antes.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function readLocalFile(path: string): Promise<Buffer> {
  return readFile(resolveLocalPath(path));
}

export async function writeLocalFile(path: string, data: Buffer): Promise<void> {
  const full = resolveLocalPath(path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
}

const localDriver: StorageDriver = {
  name: "local",

  async createUpload(path) {
    return {
      url: `/api/media/subir?path=${encodeURIComponent(path)}&firma=${signLocalPath(path)}`,
      method: "PUT",
      headers: {},
    };
  },

  publicUrl(path) {
    return `/api/media/${path}`;
  },

  async remove(paths) {
    await Promise.all(
      paths.map(async (path) => {
        // Que falte el archivo no es un error: puede haberse borrado antes.
        try {
          await unlink(resolveLocalPath(path));
        } catch {
          /* ya no estaba */
        }
      })
    );
  },
};

/* ─────────────────────────────── Selección ──────────────────────────── */

/**
 * El controlador activo. Supabase manda en cuanto están sus dos variables; si
 * no, se trabaja en local. Nunca falla por falta de configuración: eso dejaría
 * el módulo de fotos inutilizable en desarrollo.
 */
export function storage(): StorageDriver {
  return SUPABASE_URL && SUPABASE_KEY ? supabaseDriver : localDriver;
}

/** Para avisar en el panel de que en este entorno las fotos no se conservan. */
export function storageIsLocal(): boolean {
  return storage().name === "local";
}
