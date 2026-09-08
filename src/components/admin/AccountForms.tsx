"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/lib/validations";

/** Aviso de éxito o de error, con el mismo tratamiento en ambos formularios. */
function Notice({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="rounded-xl bg-olive-600/12 px-4 py-3 text-sm text-olive-700">
        {success}
      </p>
    );
  }
  return null;
}

/** Lee el mensaje de error de la API, con un respaldo genérico. */
async function errorFrom(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export function ProfileForm({ email, name }: { email: string; name: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: name ?? "", email, currentPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError(await errorFrom(response, "No se pudieron guardar los datos"));
      return;
    }

    setSuccess("Datos actualizados.");
    // La contraseña no se conserva en el formulario tras usarla.
    reset({ ...values, currentPassword: "" });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Nombre" htmlFor="account-name" error={errors.name?.message} hint="Opcional.">
        <Input
          id="account-name"
          autoComplete="name"
          placeholder="Sofía"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

      <Field
        label="Correo"
        htmlFor="account-email"
        error={errors.email?.message}
        hint="Es tu usuario para entrar al panel."
      >
        <Input
          id="account-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        label="Tu contraseña"
        htmlFor="account-confirm"
        error={errors.currentPassword?.message}
        hint="La pedimos para confirmar que eres tú."
      >
        <Input
          id="account-confirm"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...register("currentPassword")}
        />
      </Field>

      <Notice error={error} success={success} />

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Guardar datos
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError(await errorFrom(response, "No se pudo cambiar la contraseña"));
      return;
    }

    setSuccess("Contraseña actualizada. Tu sesión sigue abierta.");
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        label="Contraseña actual"
        htmlFor="password-current"
        error={errors.currentPassword?.message}
      >
        <Input
          id="password-current"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...register("currentPassword")}
        />
      </Field>

      <Field
        label="Nueva contraseña"
        htmlFor="password-new"
        error={errors.newPassword?.message}
        hint="Mínimo 8 caracteres."
      >
        <Input
          id="password-new"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...register("newPassword")}
        />
      </Field>

      <Field
        label="Repite la nueva contraseña"
        htmlFor="password-confirm"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
      </Field>

      <Notice error={error} success={success} />

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
