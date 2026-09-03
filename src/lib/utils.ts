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

/** Construye la URL pública de una invitación. */
export function buildInvitationUrl(slug: string): string {
  return `${siteUrl()}/i/${slug}`;
}
