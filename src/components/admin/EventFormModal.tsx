"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ThemePicker } from "@/components/admin/ThemePicker";
import { getTheme } from "@/lib/themes";
import type { DatePolicy } from "@/lib/event-date";
import { createEventSchema, type CreateEventInput } from "@/lib/validations";

/** Lo que el formulario necesita saber de un evento ya existente. */
export interface EditableEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  locationUrl: string | null;
  dressCode: string | null;
  dressCodeUrl: string | null;
  description: string | null;
  invitationImage: string | null;
  theme: string;
  sealedEyebrow: string | null;
  sealedHeadline: string | null;
  sealedCta: string | null;
  datePolicy: DatePolicy;
}

export function EventFormModal(props: EventFormProps & { open: boolean }) {
  const { open, ...rest } = props;
  // Montaje condicional: así el formulario siempre arranca con los valores del
  // evento seleccionado, sin necesidad de resetear a mano.
  if (!open) return null;
  return <EventFormDialog {...rest} />;
}

interface EventFormProps {
  onClose: () => void;
  onSaved: () => void;
  event?: EditableEvent | null;
}

function EventFormDialog({ onClose, onSaved, event }: EventFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(event);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: event?.name ?? "",
      // <input type="date"> habla en YYYY-MM-DD; la fecha se guarda en UTC.
      date: (event ? new Date(event.date).toISOString().slice(0, 10) : "") as unknown as Date,
      time: event?.time ?? "",
      location: event?.location ?? "",
      locationUrl: event?.locationUrl ?? "",
      dressCode: event?.dressCode ?? "",
      dressCodeUrl: event?.dressCodeUrl ?? "",
      description: event?.description ?? "",
      invitationImage: event?.invitationImage ?? "",
      theme: (event?.theme as CreateEventInput["theme"]) ?? "BOSQUE",
      sealedEyebrow: event?.sealedEyebrow ?? "",
      sealedHeadline: event?.sealedHeadline ?? "",
      sealedCta: event?.sealedCta ?? "",
    },
  });

  // useWatch en vez de watch(): watch() devuelve una función nueva en cada
  // render y el React Compiler no puede memoizar el componente si se usa.
  const theme = useWatch({ control, name: "theme" });
  // Los textos del tema se muestran como placeholder: dejar el campo vacío no
  // es un hueco, es "usa el del tema".
  const defaults = getTheme(theme).copy;

  // La fecha es el único campo con regla propia: un evento se paga por crédito,
  // y sin anclar la fecha bastaría con reescribir el del año pasado.
  const dateHint = !isEdit ? (
    "Después solo podrás moverla una vez, y como mucho un mes."
  ) : event!.datePolicy.canChange ? (
    `Un solo cambio, ${event!.datePolicy.description}.`
  ) : (
    <>
      Ya usaste el cambio de fecha de este evento.{" "}
      <Link
        href={`/admin/soporte?categoria=DATE_CHANGE&evento=${event!.id}&asunto=${encodeURIComponent(
          `Cambio de fecha de ${event!.name}`
        )}`}
        className="underline decoration-cream-300 underline-offset-2 hover:text-ink-900"
      >
        Abre un ticket
      </Link>{" "}
      y la movemos nosotros.
    </>
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const response = await fetch(isEdit ? `/api/events/${event!.id}` : "/api/events", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setServerError(payload?.error ?? "No se pudo guardar el evento");
      return;
    }

    onSaved();
    onClose();
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar evento" : "Crear evento"}
      description="Todo lo que se muestra en la invitación se edita aquí."
      className="sm:max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <Field
          label="Nombre del evento"
          htmlFor="event-name"
          error={errors.name?.message}
          hint="Con un · se parte en dos: “Maya · 29” muestra el 29 destacado."
        >
          <Input
            id="event-name"
            placeholder="Maya · 29"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Fecha"
            htmlFor="event-date"
            error={errors.date?.message}
            hint={dateHint}
          >
            {/* El campo se bloquea cuando ya se usó el cambio, y se acota con
                min/max cuando sigue disponible: es preferible que el calendario
                no ofrezca lo que el servidor va a rechazar. Aun así la regla se
                aplica en el servicio — esto es comodidad, no seguridad. */}
            <Input
              id="event-date"
              type="date"
              disabled={isEdit && !event!.datePolicy.canChange}
              min={isEdit ? event!.datePolicy.window.from : undefined}
              max={isEdit ? event!.datePolicy.window.to : undefined}
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
          </Field>

          <Field
            label="Hora"
            htmlFor="event-time"
            error={errors.time?.message}
            hint="Se muestra tal cual: “4:00 pm”."
          >
            <Input
              id="event-time"
              placeholder="4:00 pm"
              aria-invalid={Boolean(errors.time)}
              {...register("time")}
            />
          </Field>
        </div>

        <Field
          label="Lugar"
          htmlFor="event-location"
          error={errors.location?.message}
          hint="El salto de línea se respeta: la segunda línea sale más discreta."
        >
          <Textarea
            id="event-location"
            rows={2}
            placeholder={"Jardín Rosas y Miel\nSantiago Papasquiaro"}
            aria-invalid={Boolean(errors.location)}
            {...register("location")}
          />
        </Field>

        <Field
          label="Enlace del mapa"
          htmlFor="event-location-url"
          error={errors.locationUrl?.message}
          hint="Opcional. Convierte el lugar en un enlace a Google Maps."
        >
          <Input
            id="event-location-url"
            type="url"
            placeholder="https://maps.google.com/?q=…"
            aria-invalid={Boolean(errors.locationUrl)}
            {...register("locationUrl")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Código de vestimenta"
            htmlFor="event-dress-code"
            error={errors.dressCode?.message}
          >
            <Input
              id="event-dress-code"
              placeholder="Dress Code Inspo"
              aria-invalid={Boolean(errors.dressCode)}
              {...register("dressCode")}
            />
          </Field>

          <Field
            label="Enlace del vestuario"
            htmlFor="event-dress-code-url"
            error={errors.dressCodeUrl?.message}
            hint="Opcional. Un tablero de Pinterest, por ejemplo."
          >
            <Input
              id="event-dress-code-url"
              type="url"
              placeholder="https://pinterest.com/…"
              aria-invalid={Boolean(errors.dressCodeUrl)}
              {...register("dressCodeUrl")}
            />
          </Field>
        </div>

        <Field
          label="Descripción"
          htmlFor="event-description"
          error={errors.description?.message}
          hint="Opcional. Una línea corta bajo el nombre del evento."
        >
          <Input
            id="event-description"
            placeholder="Birthday Celebration"
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </Field>

        <Field
          label="Imagen de la invitación"
          htmlFor="event-image"
          error={errors.invitationImage?.message}
          hint="Opcional. Encabeza la lámina, con su proporción original."
        >
          <Input
            id="event-image"
            type="url"
            placeholder="https://…/invitacion.jpg"
            aria-invalid={Boolean(errors.invitationImage)}
            {...register("invitationImage")}
          />
        </Field>

        <fieldset className="space-y-3 border-t border-cream-200 pt-5">
          <legend className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-ink-700">
            Tema
          </legend>
          <ThemePicker value={theme} registration={register("theme")} />
        </fieldset>

        <fieldset className="space-y-5 border-t border-cream-200 pt-5">
          <legend className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-ink-700">
            Pantalla de bienvenida
          </legend>
          <p className="font-sans text-xs text-ink-500">
            Lo que el invitado ve antes de abrir la invitación. Si dejas un campo vacío se usa el
            texto del tema, que es el que aparece en gris.
          </p>

          <Field
            label="Línea superior"
            htmlFor="event-eyebrow"
            error={errors.sealedEyebrow?.message}
          >
            <Input
              id="event-eyebrow"
              placeholder={defaults.eyebrow}
              aria-invalid={Boolean(errors.sealedEyebrow)}
              {...register("sealedEyebrow")}
            />
          </Field>

          <Field label="Titular" htmlFor="event-headline" error={errors.sealedHeadline?.message}>
            <Textarea
              id="event-headline"
              rows={2}
              placeholder={defaults.headline}
              aria-invalid={Boolean(errors.sealedHeadline)}
              {...register("sealedHeadline")}
            />
          </Field>

          <Field label="Botón" htmlFor="event-cta" error={errors.sealedCta?.message}>
            <Input
              id="event-cta"
              placeholder={defaults.cta}
              aria-invalid={Boolean(errors.sealedCta)}
              {...register("sealedCta")}
            />
          </Field>
        </fieldset>

        {serverError && (
          <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? "Guardar cambios" : "Crear evento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
