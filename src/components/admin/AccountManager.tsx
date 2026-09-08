"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountFormModal } from "@/components/admin/AccountFormModal";
import type { AdminAccount } from "@/lib/admin-account";
import { cn } from "@/lib/utils";

export function AccountManager({
  accounts,
  currentAccountId,
}: {
  accounts: AdminAccount[];
  /** La cuenta en sesión: no puede eliminarse ni quitarse el superadmin. */
  currentAccountId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const remove = async (account: AdminAccount) => {
    const warning =
      account.totalEvents > 0
        ? `Se eliminarán sus ${account.totalEvents} evento(s) con todas sus invitaciones y respuestas.`
        : "No tiene eventos.";
    if (!confirm(`¿Eliminar la cuenta de ${account.email}?\n\n${warning}\n\nEsto no se puede deshacer.`)) {
      return;
    }

    setBusyId(account.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "No se pudo eliminar la cuenta");
        return;
      }
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-ink-500">
          {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"} en la plataforma.
        </p>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          icon={<UserPlus className="size-4" aria-hidden="true" />}
        >
          Nuevo cliente
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-cream-50">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-100/60">
              {["Cliente", "Cupo", "Alta", ""].map((heading, index) => (
                <th
                  key={heading || index}
                  scope="col"
                  className="px-4 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const isSelf = account.id === currentAccountId;
              const full = account.activeEvents >= account.eventQuota;

              return (
                <tr
                  key={account.id}
                  className="border-b border-cream-200/70 transition-colors last:border-0 hover:bg-cream-100/50"
                >
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2 font-serif text-base text-ink-900">
                      {account.name ?? account.email}
                      {account.isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-gold-600">
                          <ShieldCheck className="size-3" aria-hidden="true" />
                          Superadmin
                        </span>
                      )}
                      {isSelf && (
                        <span className="rounded-full bg-olive-600/12 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-olive-700">
                          Tú
                        </span>
                      )}
                    </span>
                    {account.name && (
                      <span className="mt-0.5 block font-sans text-xs text-ink-500">
                        {account.email}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 font-sans text-sm">
                    <span className={cn(full ? "text-blush-500" : "text-ink-700")}>
                      {account.activeEvents} / {account.eventQuota}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {account.totalEvents} en total
                    </span>
                  </td>

                  <td className="px-4 py-3 font-sans text-sm text-ink-500">
                    {account.createdAtLabel}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(account)}
                        icon={<Pencil className="size-3.5" aria-hidden="true" />}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(account)}
                        loading={busyId === account.id}
                        disabled={isSelf}
                        title={isSelf ? "No puedes eliminar tu propia cuenta" : undefined}
                        aria-label={`Eliminar ${account.email}`}
                        className="text-blush-500 hover:bg-blush-200/50"
                        icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AccountFormModal open={creating} onClose={() => setCreating(false)} onSaved={refresh} />
      <AccountFormModal
        open={editing !== null}
        account={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}
