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

/** Payload que recibe la API: el formulario más el slug de la invitación. */
export const rsvpSchema = rsvpFields
  .extend({ slug: z.string().min(1, "Invitación inválida") })
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

/** Alta de evento desde el panel. */
export const createEventSchema = z.object({
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
  sealedEyebrow: optionalText(60, "Máximo 60 caracteres"),
  sealedHeadline: optionalText(140, "Máximo 140 caracteres"),
  sealedCta: optionalText(40, "Máximo 40 caracteres"),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Edición de evento: todos los campos opcionales, pero al menos uno. */
export const updateEventSchema = createEventSchema
  .partial()
  .extend({ archived: z.boolean().optional() })
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
