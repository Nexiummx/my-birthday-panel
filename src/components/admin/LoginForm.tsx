"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { SocialButtons } from "@/components/admin/SocialButtons";
import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({ providers }: { providers: { google: boolean; facebook: boolean } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const next = searchParams.get("next");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Nunca se distingue "no existe la cuenta" de "contraseña incorrecta":
      // hacerlo permitiría averiguar qué correos están registrados.
      setServerError("Correo o contraseña incorrectos");
      return;
    }

    router.replace(next?.startsWith("/admin") ? next : "/admin");
    router.refresh();
  });

  return (
    <div className="space-y-5">
      <SocialButtons providers={providers} next={next ?? undefined} />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
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

      <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <div className="flex justify-end -mt-2">
        <Link
          href="/admin/recuperar"
          className="font-sans text-xs text-ink-500 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-ink-900"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

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
        icon={<LogIn className="size-4" aria-hidden="true" />}
      >
        Entrar
      </Button>
      </form>

      <p className="text-center font-sans text-sm text-ink-500">
        ¿No tienes cuenta?{" "}
        <Link
          href="/admin/registro"
          className="font-medium text-olive-600 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-olive-700"
        >
          Créala aquí
        </Link>
      </p>
    </div>
  );
}
