"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { SocialButtons } from "@/components/admin/SocialButtons";
import { signUp } from "@/lib/auth-client";
import { signUpSchema, type SignUpInput } from "@/lib/validations";

export function SignUpForm({ providers }: { providers: { google: boolean; facebook: boolean } }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.code === "USER_ALREADY_EXISTS"
          ? "Ya existe una cuenta con ese correo. Intenta iniciar sesión."
          : "No se pudo crear la cuenta. Inténtalo de nuevo."
      );
      return;
    }

    router.replace("/admin");
    router.refresh();
  });

  return (
    <div className="space-y-5">
      <SocialButtons providers={providers} />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Sofía Ramírez"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

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

        <Field
          label="Contraseña"
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
          icon={<UserPlus className="size-4" aria-hidden="true" />}
        >
          Crear cuenta
        </Button>
      </form>

      <p className="text-center font-sans text-sm text-ink-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/admin/login"
          className="font-medium text-olive-600 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-olive-700"
        >
          Entra aquí
        </Link>
      </p>
    </div>
  );
}
