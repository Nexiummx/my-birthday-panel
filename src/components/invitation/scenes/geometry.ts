/**
 * Redondeo de coordenadas calculadas.
 *
 * `Math.cos`, `Math.sin`, `Math.sqrt` y `Math.hypot` no están obligados a
 * devolver el mismo bit en todos los motores de JavaScript. Node y el navegador
 * difieren en el último dígito, y como esos números acaban en atributos del SVG
 * React lo detecta como un desajuste de hidratación:
 *
 *   servidor  x2="-50.159053651246744"
 *   cliente   x2="-50.15905365124675"
 *
 * Redondear a tres decimales elimina la diferencia sin que se note en pantalla:
 * son milésimas de unidad de viewBox.
 */
export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
