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
}
