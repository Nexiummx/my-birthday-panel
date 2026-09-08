"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { accountFormSchema, type AccountFormInput } from "@/lib/validations";
import type { AdminAccount } from "@/lib/admin-account";

export function AccountFormModal(props: AccountFormProps & { open: boolean }) {
  const { open, ...rest } = props;
  if (!open) return null;
  return <AccountFormDialog {...rest} />;
}

interface AccountFormProps {
  onClose: () => void;
  onSaved: () => void;
  account?: AdminAccount | null;
}

function AccountFormDialog({ onClose, onSaved, account }: AccountFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(account);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput>({
    // Al editar, la contraseña es opcional: solo se cambia si se escribe algo.
    resolver: zodResolver(accountFormSchema(isEdit)),
    defaultValues: {
      email: account?.email ?? "",
      name: account?.name ?? "",
      password: "",
      eventQuota: account?.eventQuota ?? 1,
      isSuperAdmin: account?.isSuperAdmin ?? false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    // Sin contraseña escrita, no se toca la que ya tiene.
    const payload = values.password?.trim()
      ? values
      : { ...values, password: undefined };

    const response = await fetch(
      isEdit ? `/api/admin/accounts/${account!.id}` : "/api/admin/accounts",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setServerError(body?.error ?? "No se pudo guardar la cuenta");
      return;
    }

    onSaved();
    onClose();
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
      description={
        isEdit
          ? "Deja la contraseña vacía para no cambiarla."
          : "Entrega estas credenciales al cliente: no hay recuperación por correo todavía."
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Nombre" htmlFor="account-name" error={errors.name?.message} hint="Opcional.">
          <Input
            id="account-name"
            placeholder="Sofía Ramírez"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

        <Field
          label="Correo"
          htmlFor="account-email"
          error={errors.email?.message}
          hint="Con este correo entrará al panel."
        >
          <Input
            id="account-email"
            type="email"
            autoComplete="off"
            placeholder="sofia@cliente.mx"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field
          label={isEdit ? "Nueva contraseña" : "Contraseña"}
          htmlFor="account-password"
          error={errors.password?.message}
          hint={isEdit ? "Vacío = se conserva la actual." : "Mínimo 8 caracteres."}
        >
          <Input
            id="account-password"
            type="text"
            autoComplete="off"
            placeholder={isEdit ? "Sin cambios" : "Al menos 8 caracteres"}
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        <Field
          label="Cupo de eventos activos"
          htmlFor="account-quota"
          error={errors.eventQuota?.message}
          hint="Cuántos eventos sin archivar puede tener a la vez."
        >
          <Input
            id="account-quota"
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            aria-invalid={Boolean(errors.eventQuota)}
            {...register("eventQuota")}
          />
        </Field>

        <label className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-olive-600"
            {...register("isSuperAdmin")}
          />
          <span>
            <span className="block font-sans text-sm text-ink-900">Acceso de superadmin</span>
            <span className="block font-sans text-xs text-ink-500">
              Podrá crear y editar cuentas de clientes. Actívalo solo para tu equipo.
            </span>
          </span>
        </label>

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
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
