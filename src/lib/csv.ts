/**
 * Construcción de CSV.
 *
 * Existe porque la lista final acaba en manos del salón, del catering o de
 * quien pasa lista en la puerta, y esa gente trabaja en Excel, no en el panel.
 *
 * Dos decisiones que parecen manías y no lo son:
 *
 *   · Se separa por PUNTO Y COMA. Excel en español interpreta la coma como
 *     separador decimal y mete todo en una sola columna; el punto y coma es lo
 *     que espera. La coma dejaría al anfitrión con un archivo inservible.
 *   · Lleva BOM al principio. Sin él, Excel abre el archivo en su codificación
 *     regional y "Mariana López" sale "Mariana LÃ³pez".
 */

import { fileSlug } from "@/lib/utils";

/** Excel en español espera punto y coma. */
const SEPARATOR = ";";

/** Marca de orden de bytes: es lo que hace que Excel entienda UTF-8. */
const BOM = "﻿";

/**
 * Escapa una celda. Además de las comillas y el separador, se neutraliza el
 * arranque por =, +, - o @: Excel los trataría como fórmula, y un invitado que
 * se llame "=SUMA(...)" no debería ejecutar nada en la máquina de nadie.
 */
function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return /["\n\r;,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(SEPARATOR));
  // Fin de línea CRLF: es lo que espera Excel en Windows, y el resto lo tolera.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Nombre de archivo seguro a partir del nombre del evento. */
export function csvFilename(eventName: string, suffix: string): string {
  return `${fileSlug(eventName)}-${suffix}.csv`;
}
