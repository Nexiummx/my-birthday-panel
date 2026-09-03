"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { createInvitationSchema, type CreateInvitationInput } from "@/lib/validations";
import type { AdminInvitation } from "@/lib/admin-invitation";

/**
 * Alta y edición de invitaciones. El slug se genera en el servidor a partir del
 * nombre, así que el formulario no lo pide (al editar se muestra como dato).
 */
export function InvitationFormModal(props: InvitationFormDialogProps & { open: boolean }) {
  const { open, ...rest } = props;
  // Se monta solo mientras está abierto, de modo que el formulario siempre
  // arranca con los valores de la invitación seleccionada.
  if (!open) return null;
  return <InvitationFormDialog {...rest} />;
}

interface InvitationFormDialogProps {
  onClose: () => void;
  onSaved: () => void;
  invitation?: AdminInvitation | null;
}

function InvitationFormDialog({ onClose, onSaved, invitation }: InvitationFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(invitation);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      guestName: invitation?.guestName ?? "",
      guestCount: invitation?.guestCount ?? 1,
      personalMessage: invitation?.personalMessage ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const response = await fetch(
      isEdit ? `/api/invitations/${invitation!.id}` : "/api/invitations",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setServerError(payload?.error ?? "No se pudo guardar la invitación");
      return;
    }

    onSaved();
    onClose();
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar invitación" : "Crear invitación"}
      description={
        isEdit
          ? `Enlace público: /i/${invitation?.slug}`
          : "El enlace se genera automáticamente a partir del nombre."
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Nombre del invitado" htmlFor="guest-name" error={errors.guestName?.message}>
          <Input
            id="guest-name"
            autoComplete="off"
            placeholder="Mariana López"
            aria-invalid={Boolean(errors.guestName)}
            {...register("guestName")}
          />
        </Field>

        <Field
          label="Número de pases"
          htmlFor="guest-count"
          error={errors.guestCount?.message}
          hint="Cuántas personas puede confirmar esta invitación."
        >
          <Input
            id="guest-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            aria-invalid={Boolean(errors.guestCount)}
            {...register("guestCount")}
          />
        </Field>

        <Field
          label="Mensaje personalizado"
          htmlFor="personal-message"
          error={errors.personalMessage?.message}
          hint="Opcional. Se muestra en la invitación, bajo los datos del evento."
        >
          <Textarea
            id="personal-message"
            rows={3}
            placeholder="Nos encantaría celebrar contigo…"
            aria-invalid={Boolean(errors.personalMessage)}
            {...register("personalMessage")}
          />
        </Field>

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
            {isEdit ? "Guardar cambios" : "Crear invitación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
