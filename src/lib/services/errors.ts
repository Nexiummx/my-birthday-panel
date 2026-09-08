import "server-only";

/**
 * Error de negocio con mensaje seguro para mostrar al usuario.
 * Vive aparte del resto de servicios porque lo consumen tanto los servicios
 * como el envoltorio de rutas de src/lib/api.ts.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
