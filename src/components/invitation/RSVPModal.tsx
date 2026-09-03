"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Heart, Minus, PartyPopper, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { rsvpFormSchema, type RsvpFormInput } from "@/lib/validations";
import type { PublicInvitation } from "@/lib/types";
import { cn } from "@/lib/utils";

type Result = { attending: boolean; guestName: string } | null;

/**
 * Confirmación de asistencia.
 *
 * Valida en el cliente con el mismo esquema Zod que usa la API, pero el límite
 * real de pases lo impone el servidor: aquí solo se refleja para el usuario.
 */
export function RSVPModal(props: RsvpDialogProps & { open: boolean }) {
  const { open, ...rest } = props;
  // El diálogo se monta solo mientras está abierto: cada apertura arranca con
  // el formulario limpio y sincronizado con la respuesta vigente, sin efectos.
  if (!open) return null;
  return <RsvpDialog {...rest} />;
}

interface RsvpDialogProps {
  onClose: () => void;
  invitation: PublicInvitation;
  onSuccess: (rsvp: {
    status: "CONFIRMED" | "DECLINED";
    guestCount: number;
    comment: string | null;
  }) => void;
}

function RsvpDialog({ onClose, invitation, onSuccess }: RsvpDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  const defaultValues: RsvpFormInput = {
    guestName: invitation.guestName,
    attending: invitation.rsvp ? invitation.rsvp.status === "CONFIRMED" : true,
    guestCount: invitation.rsvp?.guestCount || invitation.guestCount,
    comment: invitation.rsvp?.comment ?? "",
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RsvpFormInput>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues,
  });

  // `useWatch` en lugar de `watch()`: es suscripción, no una función nueva por
  // render, y no rompe la memoización del compilador de React.
  const attending = useWatch({ control, name: "attending" });
  const guestCount = useWatch({ control, name: "guestCount" });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, slug: invitation.slug }),
      });

      const payload = (await response.json()) as {
        error?: string;
        data?: { status: "CONFIRMED" | "DECLINED"; guestCount: number; comment: string | null };
      };

      if (!response.ok || !payload.data) {
        setServerError(payload.error ?? "No pudimos registrar tu respuesta. Inténtalo de nuevo.");
        return;
      }

      onSuccess(payload.data);
      setResult({ attending: payload.data.status === "CONFIRMED", guestName: values.guestName });
    } catch {
      setServerError("No hay conexión con el servidor. Revisa tu red e inténtalo otra vez.");
    }
  });

  const adjustGuests = (delta: number) => {
    const next = Math.min(Math.max((Number(guestCount) || 1) + delta, 1), invitation.guestCount);
    setValue("guestCount", next, { shouldValidate: true });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={result ? (result.attending ? "¡Nos vemos pronto!" : "Gracias por avisarnos.") : "Confirma tu asistencia"}
      description={
        result
          ? undefined
          : `Tu invitación incluye ${invitation.guestCount} ${invitation.guestCount === 1 ? "pase" : "pases"}.`
      }
    >
      {result ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-olive-600/10 text-olive-600">
            {result.attending ? (
              <PartyPopper className="size-7" aria-hidden="true" />
            ) : (
              <Heart className="size-7" aria-hidden="true" />
            )}
          </span>
          <p className="font-serif text-xl text-ink-900">
            {result.attending
              ? `¡Gracias, ${result.guestName}!`
              : `Te vamos a extrañar, ${result.guestName}.`}
          </p>
          <p className="font-sans text-sm text-ink-500">
            {result.attending
              ? "Hemos registrado tu confirmación."
              : "Hemos registrado tu respuesta."}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" size="sm" onClick={() => setResult(null)}>
              Modificar mi respuesta
            </Button>
            <Button size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Tu nombre" htmlFor="rsvp-name" error={errors.guestName?.message}>
            <Input
              id="rsvp-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.guestName)}
              {...register("guestName")}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.14em] text-ink-700">
              ¿Asistirás?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <AttendanceOption
                selected={attending === true}
                icon={<Check className="size-4" aria-hidden="true" />}
                label="Sí, asistiré"
                onSelect={() => setValue("attending", true, { shouldValidate: true })}
              />
              <AttendanceOption
                selected={attending === false}
                icon={<X className="size-4" aria-hidden="true" />}
                label="No podré asistir"
                onSelect={() => setValue("attending", false, { shouldValidate: true })}
              />
            </div>
          </fieldset>

          {attending && (
            <Field
              label="Número de personas"
              htmlFor="rsvp-guests"
              error={errors.guestCount?.message}
              hint={`Máximo ${invitation.guestCount} ${invitation.guestCount === 1 ? "persona" : "personas"}.`}
            >
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Quitar una persona"
                  onClick={() => adjustGuests(-1)}
                  disabled={Number(guestCount) <= 1}
                  className="size-11 shrink-0 px-0"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>
                <Input
                  id="rsvp-guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={invitation.guestCount}
                  aria-invalid={Boolean(errors.guestCount)}
                  className="text-center"
                  {...register("guestCount")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Agregar una persona"
                  onClick={() => adjustGuests(1)}
                  disabled={Number(guestCount) >= invitation.guestCount}
                  className="size-11 shrink-0 px-0"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </Field>
          )}

          <Field
            label="Mensaje (opcional)"
            htmlFor="rsvp-comment"
            error={errors.comment?.message}
          >
            <Textarea
              id="rsvp-comment"
              rows={3}
              placeholder="Déjanos unas palabras…"
              aria-invalid={Boolean(errors.comment)}
              {...register("comment")}
            />
          </Field>

          {serverError && (
            <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {invitation.rsvp ? "Actualizar respuesta" : "Enviar respuesta"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function AttendanceOption({
  selected,
  label,
  icon,
  onSelect,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center",
        "font-sans text-sm transition-all duration-200",
        selected
          ? "border-olive-600 bg-olive-600/10 text-olive-700 shadow-sm"
          : "border-cream-300 bg-cream-50 text-ink-500 hover:border-gold-400 hover:text-ink-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
