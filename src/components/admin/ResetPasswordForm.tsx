"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token ?? "",
    });

    if (error) {
      setServerError(
        "El enlace ya no es válido. Caducan en una hora y solo se pueden usar una vez; pide uno nuevo."
      );
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  });

  // Sin token no hay nada que hacer: se llegó aquí por una URL suelta.
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          Este enlace está incompleto. Pide uno nuevo desde “¿Olvidaste tu contraseña?”.
        </p>
        <Link
          href="/admin/recuperar"
          className="inline-block font-sans text-sm font-medium text-olive-600 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-olive-700"
        >
          Pedir enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        label="Nueva contraseña"
        htmlFor="password"
        error={errors.password?.message}
        hint="Mínimo 8 caracteres."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Field
        label="Repite la contraseña"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
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
        icon={<KeyRound className="size-4" aria-hidden="true" />}
      >
        Guardar contraseña
      </Button>
    </form>
  );
}
