import { z } from "zod";

export const INVITATION_STATUS = ["PENDING", "CONFIRMED", "DECLINED"] as const;
export type InvitationStatusValue = (typeof INVITATION_STATUS)[number];

/** Login del panel administrativo. */
export const loginSchema = z.object({
  email: z.email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Alta de invitación desde el panel. */
export const createInvitationSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo"),
  guestCount: z.coerce
    .number<number>()
    .int("Debe ser un número entero")
    .min(1, "Debe haber al menos 1 pase")
    .max(20, "Máximo 20 pases por invitación"),
  personalMessage: z
    .string()
    .trim()
    .max(400, "El mensaje no puede superar 400 caracteres")
    .optional()
    .or(z.literal("")),
  eventId: z.string().min(1).optional(),
  /// Teléfono para mandar la invitación por WhatsApp de un toque. Se guarda
  /// tal cual: normalizarlo aquí le impediría corregir lo que él ve bien.
  phone: z.string().trim().max(30, "El teléfono es demasiado largo").optional(),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

/** Edición de invitación. Todos los campos son opcionales. */
export const updateInvitationSchema = createInvitationSchema
  .partial()
  .extend({
    status: z.enum(INVITATION_STATUS).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo admite minúsculas, números y guiones")
      .min(2)
      .max(60)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No hay cambios que guardar",
  });
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;

/**
 * Respuesta del invitado. El número de personas se valida además contra los
 * pases asignados en el servidor (el cliente no es fuente de verdad).
 */
const rsvpFields = z.object({
  guestName: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre")
    .max(80, "El nombre es demasiado largo"),
  attending: z.boolean(),
  guestCount: z.coerce
    .number<number>()
    .int("Debe ser un número entero")
    .min(0, "El número de personas no puede ser negativo")
    .max(20, "Número de personas fuera de rango"),
  comment: z
    .string()
    .trim()
    .max(400, "El mensaje no puede superar 400 caracteres")
    .optional()
    .or(z.literal("")),
});

/** Si asiste, debe indicar al menos una persona. */
const requiresGuests = {
  check: (value: { attending: boolean; guestCount: number }) =>
    !value.attending || value.guestCount >= 1,
  message: "Indica al menos 1 persona",
  path: ["guestCount"] as const,
};

/** Formulario del RSVP en el cliente (el slug lo agrega el componente). */
export const rsvpFormSchema = rsvpFields.refine(requiresGuests.check, {
  message: requiresGuests.message,
  path: [...requiresGuests.path],
});
export type RsvpFormInput = z.infer<typeof rsvpFormSchema>;

/**
 * Payload que recibe la API: el formulario más las dos mitades de la ruta de la
 * invitación. El evento viaja también porque el slug del invitado solo es único
 * dentro de su evento.
 */
export const rsvpSchema = rsvpFields
  .extend({
    evento: z.string("Invitación inválida").min(1, "Invitación inválida"),
    slug: z.string("Invitación inválida").min(1, "Invitación inválida"),
  })
  .refine(requiresGuests.check, {
    message: requiresGuests.message,
    path: [...requiresGuests.path],
  });
export type RsvpInput = z.infer<typeof rsvpSchema>;

/**
 * Temas disponibles. Duplica el enum EventTheme de Prisma a propósito, igual
 * que INVITATION_STATUS: así los componentes de cliente no arrastran el cliente
 * generado. Si se agrega un tema, hay que tocar ambos lados.
 */
export const EVENT_THEMES = ["BOSQUE", "VAQUEROS", "BARBIE", "DISCO"] as const;
export type EventThemeValue = (typeof EVENT_THEMES)[number];

/** Campo de texto opcional: se guarda NULL cuando llega vacío. */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(""));

/** Enlace opcional. Se valida como URL solo si trae algo. */
const optionalUrl = z
  .union([z.url("Debe ser un enlace válido (https://…)"), z.literal("")])
  .optional();

/**
 * Ruta pública del evento: /e/[slug]/i/[invitado].
 *
 * Es opcional en todas partes porque tiene un valor de fábrica sacado del
 * nombre; el anfitrión solo la escribe si quiere retocarla.
 */
const eventSlugField = z
  .union([
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El enlace solo admite minúsculas, números y guiones")
      .min(3, "El enlace es demasiado corto")
      .max(60, "El enlace es demasiado largo"),
    // El formulario manda "" cuando el campo no se pinta —al crear— y cuando el
    // anfitrión lo vacía. En los dos casos significa "el de siempre", no un
    // enlace inválido: sin esta rama, crear un evento fallaba la validación.
    z.literal(""),
  ])
  .optional();

/** Alta de evento desde el panel. */
export const createEventSchema = z.object({
  slug: eventSlugField,
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo"),
  date: z.coerce.date<Date>("Fecha inválida"),
  time: z
    .string()
    .trim()
    .min(1, "Indica la hora")
    .max(40, "La hora es demasiado larga"),
  location: z
    .string()
    .trim()
    .min(3, "Indica el lugar")
    .max(400, "La dirección es demasiado larga"),
  locationUrl: optionalUrl,
  dressCode: optionalText(120, "El código de vestimenta es demasiado largo"),
  dressCodeUrl: optionalUrl,
  description: optionalText(400, "La descripción no puede superar 400 caracteres"),
  invitationImage: optionalUrl,
  theme: z.enum(EVENT_THEMES),
  inviteMessage: optionalText(600, "El mensaje es demasiado largo"),
  giftRegistryUrl: optionalUrl,
  giftRegistryLabel: optionalText(60, "Máximo 60 caracteres"),
  sealedEyebrow: optionalText(60, "Máximo 60 caracteres"),
  sealedHeadline: optionalText(140, "Máximo 140 caracteres"),
  sealedCta: optionalText(40, "Máximo 40 caracteres"),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Edición de evento: todos los campos opcionales, pero al menos uno. */
export const updateEventSchema = createEventSchema
  .partial()
  .extend({
    archived: z.boolean().optional(),
    /// Cierra la subida de fotos sin borrar las que ya hay.
    photosEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No hay cambios que guardar",
  });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/** Datos de la cuenta que el titular puede editar. */
export const updateProfileSchema = z.object({
  name: optionalText(80, "El nombre es demasiado largo"),
  email: z.email("Correo electrónico inválido").trim().toLowerCase(),
  /** Cambiar el correo cambia el acceso, así que se confirma con la contraseña. */
  currentPassword: z.string().min(1, "Escribe tu contraseña para confirmar"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Cambio de contraseña. Se exige la actual: sin correo configurado todavía no
 * hay recuperación, así que esta es la única barrera contra que alguien con la
 * sesión abierta se apropie de la cuenta.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    // 8 y no 6 como el login: las cuentas viejas se quedan como estén, pero
    // toda contraseña nueva sube el listón.
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(200, "La contraseña es demasiado larga"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Alta de cuenta desde el panel de superadmin. */
export const createAccountSchema = z.object({
  email: z.email("Correo electrónico inválido").trim().toLowerCase(),
  name: optionalText(80, "El nombre es demasiado largo"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200, "La contraseña es demasiado larga"),
  eventQuota: z.coerce
    .number<number>()
    .int("Debe ser un número entero")
    .min(0, "El cupo no puede ser negativo")
    .max(50, "Cupo fuera de rango"),
  isSuperAdmin: z.boolean().optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** Edición de cuenta por el superadmin. Todo opcional, pero al menos un campo. */
export const updateAccountSchema = createAccountSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No hay cambios que guardar",
  });
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/**
 * Formulario de cuenta del panel de superadmin.
 *
 * La contraseña vive como opcional en el tipo —es obligatoria al crear pero no
 * al editar— y la diferencia se resuelve en un refine, no con dos esquemas
 * distintos: dos esquemas producirían dos tipos y el formulario no podría
 * tiparse de una sola forma.
 */
const accountFormFields = z.object({
  email: z.email("Correo electrónico inválido").trim().toLowerCase(),
  name: optionalText(80, "El nombre es demasiado largo"),
  password: z.string().max(200, "La contraseña es demasiado larga").optional(),
  eventQuota: z.coerce
    .number<number>()
    .int("Debe ser un número entero")
    .min(0, "El cupo no puede ser negativo")
    .max(50, "Cupo fuera de rango"),
  isSuperAdmin: z.boolean().optional(),
});
export type AccountFormInput = z.infer<typeof accountFormFields>;

export function accountFormSchema(isEdit: boolean) {
  return accountFormFields.superRefine((value, ctx) => {
    const password = value.password?.trim() ?? "";

    if (!isEdit && password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "La contraseña debe tener al menos 8 caracteres",
      });
      return;
    }

    // Al editar, vacío significa "no la cambies"; con algo escrito, se exige.
    if (isEdit && password.length > 0 && password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "La nueva contraseña debe tener al menos 8 caracteres",
      });
    }
  });
}

/** Alta pública de cuenta. */
export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe tu nombre").max(80, "El nombre es demasiado largo"),
    email: z.email("Correo electrónico inválido").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(200, "La contraseña es demasiado larga"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Petición de restablecimiento: solo el correo. */
export const forgotPasswordSchema = z.object({
  email: z.email("Correo electrónico inválido").trim().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Nueva contraseña, ya con el token del correo en la URL. */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(200, "La contraseña es demasiado larga"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Importación de invitados en bloque.
 *
 * El texto pegado se analiza en el cliente para poder enseñar la vista previa,
 * pero la API recibe las filas ya separadas y las vuelve a validar: el cliente
 * nunca es fuente de verdad.
 */
export const importInvitationsSchema = z.object({
  eventId: z.string().min(1).optional(),
  guests: z
    .array(
      z.object({
        guestName: z
          .string()
          .trim()
          .min(2, "El nombre debe tener al menos 2 caracteres")
          .max(80, "El nombre es demasiado largo"),
        guestCount: z.coerce
          .number<number>()
          .int("Debe ser un número entero")
          .min(1, "Debe haber al menos 1 pase")
          .max(20, "Máximo 20 pases por invitación"),
        phone: z.string().trim().max(30).optional(),
      })
    )
    .min(1, "No hay invitados que importar")
    .max(500, "Máximo 500 invitados por importación"),
});
export type ImportInvitationsInput = z.infer<typeof importInvitationsSchema>;

/** Una fila del texto pegado, ya interpretada. */
export interface ParsedGuest {
  guestName: string;
  guestCount: number;
  /** Teléfono tal y como lo escribió el anfitrión, si venía. */
  phone?: string;
  /** Motivo por el que la fila no se puede importar, si lo hay. */
  error?: string;
}

/**
 * Interpreta el texto pegado.
 *
 * Acepta "Nombre, pases, teléfono" en cualquier combinación, con coma, punto y
 * coma o tabulador —que es lo que sale al copiar de una hoja de cálculo—. Las
 * columnas se reconocen por su forma y no por su posición, porque una lista de
 * verdad viene como venga: "Ana, 2", "Ana, 5512345678" y "Ana, 2, 55 1234 5678"
 * son todas válidas y quieren decir cosas distintas.
 *
 * Las filas problemáticas se devuelven marcadas en vez de descartarse: es
 * preferible que el anfitrión vea qué falló a que desaparezcan en silencio.
 */

/** ¿Es un número de pases? Un entero pequeño, no un teléfono. */
function looksLikePasses(value: string): boolean {
  return /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 20;
}

/** ¿Tiene pinta de teléfono? Diez dígitos o más, con la puntuación que sea. */
function looksLikePhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 10;
}

export function parseGuestList(raw: string): ParsedGuest[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [rawName, ...rest] = line.split(/[\t,;]/).map((part) => part.trim());
      const guestName = rawName ?? "";

      if (guestName.length < 2) {
        return { guestName: line, guestCount: 1, error: "Nombre demasiado corto" };
      }
      if (guestName.length > 80) {
        return { guestName, guestCount: 1, error: "Nombre demasiado largo" };
      }

      let guestCount: number | null = null;
      let phone: string | undefined;

      for (const part of rest) {
        if (part === "") continue;

        if (guestCount === null && looksLikePasses(part)) {
          guestCount = Number(part);
          continue;
        }
        if (phone === undefined && looksLikePhone(part)) {
          phone = part;
          continue;
        }

        return {
          guestName,
          guestCount: guestCount ?? 1,
          phone,
          error: `No entendí "${part}": se esperaban pases (1-20) o un teléfono`,
        };
      }

      // Sin número de pases se asume uno, que es el caso más común.
      return { guestName, guestCount: guestCount ?? 1, ...(phone ? { phone } : {}) };
    });
}

/**
 * Tickets. Duplican los enums de Prisma por la misma razón que EVENT_THEMES:
 * los componentes de cliente no pueden arrastrar el cliente generado.
 */
export const TICKET_CATEGORIES = ["DATE_CHANGE", "BILLING", "EVENT", "OTHER"] as const;
export type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = ["OPEN", "ANSWERED", "CLOSED"] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORY_LABELS: Record<TicketCategoryValue, string> = {
  DATE_CHANGE: "Cambio de fecha",
  BILLING: "Planes y pagos",
  EVENT: "Mi evento",
  OTHER: "Otro",
};

export const TICKET_STATUS_LABELS: Record<TicketStatusValue, string> = {
  OPEN: "Abierto",
  ANSWERED: "Respondido",
  CLOSED: "Cerrado",
};

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(4, "Ponle un asunto de al menos 4 caracteres")
    .max(140, "El asunto es demasiado largo"),
  body: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más para poder ayudarte")
    .max(4000, "El mensaje es demasiado largo"),
  // Sin .default(): un valor por defecto en Zod hace que el tipo de entrada y
  // el de salida difieran, y zodResolver deja de encajar con useForm. El
  // formulario siempre manda uno.
  category: z.enum(TICKET_CATEGORIES),
  /// Evento al que se refiere. Cadena vacía = ninguno, que es lo que manda un
  /// <select> sin elegir.
  eventId: z.string().trim().max(40).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Escribe tu mensaje")
    .max(4000, "El mensaje es demasiado largo"),
});
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

/** Cambio de fecha hecho por el equipo desde un ticket. Sin ventana: ese es el punto. */
export const resolveDateSchema = z.object({
  date: z.coerce.date<Date>("Fecha inválida"),
});
export type ResolveDateInput = z.infer<typeof resolveDateSchema>;

/* ──────────────────────────── Fotos y videos ───────────────────────── */

/** Qué se está subiendo. Sin él todo es foto, que es lo que había antes. */
export const mediaKindSchema = z.enum(["PHOTO", "VIDEO"]);
export type MediaKindValue = z.infer<typeof mediaKindSchema>;

/**
 * Las dos puertas de subida. Al menos una tiene que venir, y el servicio decide
 * cuál manda: con `slug` la foto se firma con el nombre del invitado y el
 * `authorName` del cuerpo se ignora.
 */
const photoSource = {
  code: z.string().trim().max(40).optional(),
  /** Mitad de evento de la ruta. Solo tiene sentido junto a `slug`. */
  evento: z.string().trim().max(60).optional(),
  slug: z.string().trim().max(120).optional(),
};

const requireSource = (
  value: { code?: string; evento?: string; slug?: string },
  ctx: z.RefinementCtx
) => {
  if (!value.code && !value.slug) {
    ctx.addIssue({ code: "custom", message: "Falta el evento", path: ["code"] });
  }
  // Media puerta no abre: sin el evento, el slug del invitado es ambiguo.
  if (value.slug && !value.evento) {
    ctx.addIssue({ code: "custom", message: "Falta el evento", path: ["evento"] });
  }
};

/** Paso 1: pedir permiso para subir. Devuelve a dónde mandar el archivo. */
export const signPhotoSchema = z
  .object({
    ...photoSource,
    kind: mediaKindSchema.optional(),
    contentType: z.string().trim().min(1, "Falta el tipo de archivo").max(60),
    bytes: z.coerce.number<number>().int().positive("El archivo está vacío"),
  })
  .superRefine(requireSource);
export type SignPhotoInput = z.infer<typeof signPhotoSchema>;

/** Paso 2: confirmar que el archivo ya está arriba. */
export const registerPhotoSchema = z
  .object({
    ...photoSource,
    kind: mediaKindSchema.optional(),
    path: z.string().trim().min(1).max(300),
    width: z.coerce.number<number>().int().positive(),
    height: z.coerce.number<number>().int().positive(),
    bytes: z.coerce.number<number>().int().positive(),
    /// Solo videos: la portada ya subida y cuánto dura el clip. El tope está
    /// medio segundo por encima del de video.ts para absorber el redondeo del
    /// grabador, que casi nunca corta exactamente donde se le pide.
    posterPath: z.string().trim().min(1).max(300).optional(),
    durationMs: z.coerce.number<number>().int().positive().max(30_500).optional(),
    /// Solo se usa cuando se entra por el QR: con invitación manda su nombre.
    authorName: z.string().trim().max(80).optional(),
    caption: z.string().trim().max(140, "El pie de foto es demasiado largo").optional(),
  })
  .superRefine(requireSource);
export type RegisterPhotoInput = z.infer<typeof registerPhotoSchema>;

/* ──────────────────────────────── Pagos ────────────────────────────── */

/** Solo el id del plan: el precio sale del catálogo del servidor, nunca del
 *  navegador. Si viniera de aquí, se podría comprar cualquier plan por un peso. */
export const checkoutSchema = z.object({
  planId: z.string().trim().min(1, "Falta el plan").max(40),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ──────────────────────── Música del recuerdo ──────────────────────── */

/** Tope del desplazamiento: dos horas cubre cualquier canción con holgura. */
const MAX_START_MS = 2 * 60 * 60 * 1000;

/** Un MP3 de cuatro minutos a 192 kb/s pesa unos 5,8 MB. Vive aquí, y no en el
 *  servicio, para que el navegador pueda avisar antes de subir doce megas en
 *  balde; el servidor lo vuelve a comprobar de todas formas. */
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export const signSoundtrackSchema = z.object({
  contentType: z.string().trim().min(1, "Falta el tipo de archivo").max(60),
  bytes: z.coerce.number<number>().int().positive("El archivo está vacío"),
});
export type SignSoundtrackInput = z.infer<typeof signSoundtrackSchema>;

export const saveSoundtrackSchema = z.object({
  path: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1, "Falta el nombre del archivo").max(120),
  startMs: z.coerce.number<number>().int().min(0).max(MAX_START_MS),
});
export type SaveSoundtrackInput = z.infer<typeof saveSoundtrackSchema>;

export const soundtrackStartSchema = z.object({
  startMs: z.coerce.number<number>().int().min(0).max(MAX_START_MS),
});
export type SoundtrackStartInput = z.infer<typeof soundtrackStartSchema>;

/** Acciones del anfitrión sobre una foto. */
export const updatePhotoSchema = z.object({ hidden: z.boolean() });
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;

/**
 * Selección del recuerdo. Llega la lista completa y en orden, no un cambio
 * suelto: ver saveCuration.
 */
export const saveCurationSchema = z.object({
  photoIds: z.array(z.string().trim().min(1).max(40)).max(50),
  messageIds: z.array(z.string().trim().min(1).max(40)).max(50),
  /// Opcional para no romper a quien mande el cuerpo de antes: un panel sin
  /// actualizar sigue guardando fotos y mensajes sin tocar los videos.
  clipIds: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
});
export type SaveCurationInput = z.infer<typeof saveCurationSchema>;

/** Marcar invitaciones como enviadas, en bloque. */
export const markSentSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(40)).min(1, "No hay invitaciones").max(500),
  sent: z.boolean(),
});
export type MarkSentInput = z.infer<typeof markSentSchema>;

/** Registrar la llegada de un invitado el día del evento. */
export const checkInSchema = z.object({
  /// Cuántas personas de su pase llegaron. 0 deshace la entrada.
  count: z.coerce.number<number>().int().min(0).max(20),
});
export type CheckInInput = z.infer<typeof checkInSchema>;
