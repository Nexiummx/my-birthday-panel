import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PasswordForm, ProfileForm } from "@/components/admin/AccountForms";
import { getAccount } from "@/lib/services/account";
import { requirePanelContext } from "@/lib/panel";
import { formatLongDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta · Panel",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const { session } = await requirePanelContext();
  const account = await getAccount(session.sub);

  if (!account) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-olive-600">Cuenta</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-forest-800 sm:text-4xl">
          Mi cuenta
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-500">
          Tu plan incluye{" "}
          {account.eventQuota === 1 ? "un evento" : `${account.eventQuota} eventos`}, y llevas{" "}
          {account.eventsUsed} {account.eventsUsed === 1 ? "usado" : "usados"}. Cuenta creada el{" "}
          {formatLongDate(account.createdAt)}.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="datos"
          className="rounded-2xl border border-cream-200 bg-cream-50 p-6"
        >
          <h2 id="datos" className="font-serif text-xl text-ink-900">
            Datos de acceso
          </h2>
          <p className="mt-1 mb-5 font-sans text-sm text-ink-500">
            El correo es con el que entras al panel.
          </p>
          <ProfileForm email={account.email} name={account.name} />
        </section>

        <section
          aria-labelledby="contrasena"
          className="rounded-2xl border border-cream-200 bg-cream-50 p-6"
        >
          <h2 id="contrasena" className="font-serif text-xl text-ink-900">
            Contraseña
          </h2>
          <p className="mt-1 mb-5 font-sans text-sm text-ink-500">
            Cámbiala cuando quieras. Todavía no hay recuperación por correo, así que guárdala
            en un sitio seguro.
          </p>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
