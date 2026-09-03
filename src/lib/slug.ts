/**
 * Convierte un nombre en un slug amigable: "Mariana López" → "mariana-lopez".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Devuelve un slug único a partir de los slugs ya ocupados.
 * "mariana-lopez" → "mariana-lopez-2" → "mariana-lopez-3" …
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || "invitado";
  const used = new Set(taken);

  if (!used.has(root)) return root;

  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) {
    suffix += 1;
  }
  return `${root}-${suffix}`;
}
