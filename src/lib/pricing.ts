/**
 * Catálogo comercial: qué se vende, a qué precio y con cuánto cupo.
 *
 * Es el único sitio donde viven los precios. Cambiarlos aquí los cambia en la
 * portada y en el panel a la vez, sin tocar componentes.
 *
 * Una advertencia importante sobre lo que se puede prometer: los únicos
 * límites que la aplicación aplica de verdad son dos — los créditos de evento
 * (`quota`, ver `getQuota` en services/events.ts) y la regla de cambio de fecha
 * (ver lib/event-date.ts). Todo lo demás que aparezca en `features` es una
 * promesa de servicio que cumple el equipo a mano. No agregues aquí un límite
 * de invitados o de mensajes: no hay nada en el código que lo haga cumplir.
 *
 * No importa nada del servidor: lo consumen la portada pública y el panel.
 */

export interface Plan {
  id: string;
  name: string;
  /** Pesos mexicanos, IVA incluido. */
  price: number;
  /** Qué se está pagando: "por evento", "al mes". */
  period: string;
  /**
   * Créditos de evento que otorga el plan. Es el valor que se pone en el cupo
   * de la cuenta. Un crédito se consume al crear un evento y no vuelve al
   * archivarlo: si volviera, un pago único daría fiesta cada año.
   */
  quota: number;
  /** Para quién es, en una línea. */
  audience: string;
  features: readonly string[];
  /** El plan que se destaca en la portada. Solo uno. */
  featured?: boolean;
}

/** Lo que lleva cualquier plan: se repite en las tres tarjetas a propósito. */
const INCLUDED = [
  "Los cuatro temas, con su escena y sus tipografías",
  "Un enlace propio para cada invitado, con su nombre",
  "Invitados ilimitados",
  "Confirmaciones y mensajes en vivo",
  "Carga de la lista pegando desde Excel",
  // La fecha NO entra aquí: se puede mover una vez y como mucho un mes. Ver
  // lib/event-date.ts y la sección "Cambios de fecha" de los términos.
  "Cambios de textos, lugar y detalles cuando quieras",
] as const;

export const PLANS: readonly Plan[] = [
  {
    id: "unico",
    name: "Evento único",
    price: 1490,
    period: "pago único",
    quota: 1,
    audience: "Una celebración: XV años, boda, cumpleaños.",
    features: INCLUDED,
    featured: true,
  },
  {
    id: "doble",
    name: "Dos eventos",
    price: 2490,
    period: "pago único",
    quota: 2,
    audience: "Dos celebraciones, o civil y fiesta por separado.",
    features: [...INCLUDED, "Dos eventos, cuando quieras usarlos"],
  },
  {
    id: "organizador",
    name: "Organizadores",
    price: 890,
    period: "al mes",
    quota: 5,
    audience: "Salones, wedding planners y quien organiza todo el año.",
    features: [
      ...INCLUDED,
      "Cinco créditos de evento cada mes",
      "Damos de alta tus eventos por ti",
      "Acompañamiento por WhatsApp",
    ],
  },
];

/** El plan destacado, o el primero si nadie lo está. */
export const FEATURED_PLAN = PLANS.find((plan) => plan.featured) ?? PLANS[0];

/**
 * Qué plan corresponde a un cupo. Sirve para nombrar en el panel lo que el
 * cliente ya pagó. Cupo 0 es "sin plan": una cuenta recién registrada.
 */
export function planForQuota(quota: number): Plan | null {
  if (quota <= 0) return null;
  return PLANS.find((plan) => plan.quota >= quota) ?? PLANS[PLANS.length - 1];
}

/**
 * Canal por el que se cierra la venta. En México WhatsApp convierte mucho
 * mejor que un formulario, así que es el primero; el correo queda de respaldo
 * para cuando no haya número configurado.
 */
export const CONTACT = {
  /** Solo dígitos, con lada país. Ej. 5215512345678 */
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hola@nexiummx.com",
};

/**
 * Enlace para pedir la activación de un plan, con el mensaje ya escrito. Si la
 * cuenta ya existe se incluye el correo: es lo que el equipo necesita para
 * subirle el cupo sin tener que preguntarlo.
 */
export function contactHref(options: { plan?: Plan; accountEmail?: string } = {}) {
  const { plan, accountEmail } = options;

  const message = [
    plan
      ? `Hola, quiero activar el plan "${plan.name}" de invitaciones digitales.`
      : "Hola, quiero información sobre las invitaciones digitales.",
    accountEmail ? `Mi cuenta es ${accountEmail}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const digits = CONTACT.whatsapp.replace(/\D/g, "");
  if (digits) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  const subject = plan ? `Activar plan ${plan.name}` : "Invitaciones digitales";
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

/** Nombre del canal, para etiquetar el botón sin mentir. */
export const CONTACT_LABEL = CONTACT.whatsapp.replace(/\D/g, "") ? "WhatsApp" : "correo";

/**
 * Precio en pesos. Formateado a mano y no con Intl a propósito: el servidor y
 * el navegador no siempre traen los mismos datos de localización, y una
 * diferencia de un espacio rompe la hidratación.
 */
export function formatPrice(amount: number) {
  return `$${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
