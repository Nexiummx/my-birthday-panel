import "server-only";

/**
 * Qué proveedores sociales están realmente configurados.
 *
 * Se resuelve en el servidor y se pasa a los formularios: un botón de "entrar
 * con Google" sin credenciales lleva a una pantalla de error de Google, así
 * que es mejor no pintarlo. Facebook queda cableado pero apagado hasta que
 * Meta apruebe la app; encenderlo es solo poner sus dos variables.
 */
export function availableProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
  };
}
