/**
 * Sustituto de `server-only` para las pruebas.
 *
 * El paquete real lanza al importarse fuera de un componente de servidor, que
 * es exactamente lo que queremos en producción y exactamente lo que impide
 * probar un módulo de servicios en Node. Se cambia por nada.
 */
export {};
