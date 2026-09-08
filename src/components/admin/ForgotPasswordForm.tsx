"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/admin/restablecer",
    });

    if (error) {
      setServerError("No se pudo enviar el correo. Inténtalo de nuevo en un momento.");
      return;
    }

    setSent(true);
  });

  // El mensaje no confirma si el correo existe: hacerlo permitiría averiguar
  // qué cuentas están registradas.
  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <p role="status" className="rounded-xl bg-olive-600/12 px-4 py-3 text-sm text-olive-700">
          Si ese correo tiene una cuenta, le acabamos de enviar un enlace para cambiar la
          contraseña. Caduca en una hora.
        </p>
        <p className="font-sans text-sm text-ink-500">
          Revisa también la carpeta de spam.
        </p>
        <Link
          href="/admin/login"
          className="inline-block font-sans text-sm font-medium text-olive-600 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-olive-700"
        >
          Volver al acceso
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="font-sans text-sm text-ink-500">
        Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.
      </p>

      <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        className="w-full"
        icon={<Send className="size-4" aria-hidden="true" />}
      >
        Enviar enlace
      </Button>

      <p className="text-center font-sans text-sm text-ink-500">
        <Link
          href="/admin/login"
          className="underline decoration-cream-300 underline-offset-4 transition-colors hover:text-ink-900"
        >
          Volver al acceso
        </Link>
      </p>
    </form>
  );
}
