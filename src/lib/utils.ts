/** Une clases condicionalmente sin dependencias externas. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "26 de septiembre de 2026" */
export function formatLongDate(date: Date | string): string {
  return DATE_FORMATTER.format(new Date(date));
}

/** "26 de septiembre" — sin año, para la pieza visual de la invitación. */
export function formatInvitationDate(date: Date | string): string {
  return formatLongDate(date).replace(/ de \d{4}$/, "");
}

/** "26/09/2026" */
export function formatShortDate(date: Date | string): string {
  return SHORT_DATE_FORMATTER.format(new Date(date));
}

/** "26 sept 2026, 18:40" */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATE_TIME_FORMATTER.format(new Date(date));
}

/** Porcentaje entero, seguro ante divisiones por cero. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Origen público de la app. `NEXT_PUBLIC_APP_URL` manda; en los deploys de
 * preview de Vercel, donde el dominio es distinto en cada uno, `VERCEL_URL`
 * lo sustituye para que las miniaturas y los enlaces no apunten a producción.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/**
 * Ruta pública de una invitación, sin el origen: /e/[evento]/i/[invitado].
 *
 * El prefijo /e/ está para que un evento no pueda chocar nunca con una ruta de
 * la aplicación. Sin él, dar de alta un evento llamado "precios" o estrenar
 * mañana una página /blog dejaría a alguien sin invitación, y esa colisión
 * aparecería en producción y no aquí.
 */
export function invitationPath(eventSlug: string, slug: string): string {
  return `/e/${eventSlug}/i/${slug}`;
}

/** Construye la URL pública completa de una invitación. */
export function buildInvitationUrl(eventSlug: string, slug: string): string {
  return `${siteUrl()}${invitationPath(eventSlug, slug)}`;
}

/**
 * Trozo de nombre de archivo a partir de un texto libre.
 *
 * Sin acentos ni espacios: un archivo llamado "Maya · 29.mp4" viaja mal por
 * WhatsApp y por más de un gestor de archivos.
 */
export function fileSlug(text: string, fallback = "evento"): string {
  const base = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return base || fallback;
}

/**
 * Milisegundos a "m:ss". Se usa para los clips, que nunca pasan de un minuto,
 * así que no contempla horas.
 */
export function formatDuration(ms: number | null | undefined): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
