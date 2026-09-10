/**
 * Forma de la sesión que consume el resto de la aplicación.
 *
 * Se conserva tal cual del sistema anterior a propósito: trece archivos
 * dependen de `session.sub`, y mantener el contrato deja el cambio de motor
 * de autenticación confinado a esta capa.
 */
export interface SessionPayload {
  /** Id de la cuenta. */
  sub: string;
  email: string;
  /**
   * Token de ESTA sesión.
   *
   * Solo lo necesita quien tiene que distinguir la sesión actual de las demás
   * —cambiar la contraseña cierra las otras y conserva esta—, por eso es
   * opcional: el resto de la aplicación sigue trabajando con `sub` y `email`.
   */
  token?: string;
}
