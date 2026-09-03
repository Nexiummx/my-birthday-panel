"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, ExternalLink, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { InvitationFormModal } from "@/components/admin/InvitationFormModal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import type { AdminInvitation } from "@/lib/admin-invitation";

export function InvitationTable({ invitations }: { invitations: AdminInvitation[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminInvitation | null>(null);
  const [deleting, setDeleting] = useState<AdminInvitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copyLink = async (invitation: AdminInvitation) => {
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopiedId(invitation.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Tu navegador bloqueó el portapapeles. Copia el enlace manualmente.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/invitations/${deleting.id}`, { method: "DELETE" });
    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "No se pudo eliminar la invitación");
      return;
    }

    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-ink-500">
          {invitations.length} {invitations.length === 1 ? "invitación" : "invitaciones"} en total
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          icon={<Plus className="size-4" aria-hidden="true" />}
        >
          Crear invitación
        </Button>
      </div>

      {error && <ErrorState description={error} />}

      {invitations.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-8" aria-hidden="true" />}
          title="Aún no hay invitaciones"
          description="Crea la primera invitación y comparte su enlace individual con el invitado."
          action={
            <Button
              className="mt-2"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              icon={<Plus className="size-4" aria-hidden="true" />}
            >
              Crear invitación
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-cream-50">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-100/60">
                {["Invitado", "Enlace", "Pases", "Estado", "Creada", "Respondió", "Acciones"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr
                  key={invitation.id}
                  className="border-b border-cream-200/70 transition-colors last:border-0 hover:bg-cream-100/50"
                >
                  <td className="px-4 py-3 font-serif text-base text-ink-900">
                    {invitation.guestName}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded-md bg-cream-200/70 px-2 py-1 font-mono text-xs text-ink-700">
                      /i/{invitation.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-700">
                    {invitation.guestCount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invitation.status} />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-500">
                    {invitation.createdAtLabel}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-500">
                    {invitation.respondedAtLabel}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <IconAction
                        label={`Ver invitación de ${invitation.guestName}`}
                        href={`/i/${invitation.slug}`}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </IconAction>
                      <IconAction
                        label={`Editar invitación de ${invitation.guestName}`}
                        onClick={() => {
                          setEditing(invitation);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </IconAction>
                      <IconAction
                        label={`Copiar enlace de ${invitation.guestName}`}
                        onClick={() => copyLink(invitation)}
                      >
                        {copiedId === invitation.id ? (
                          <Check className="size-4 text-olive-600" aria-hidden="true" />
                        ) : (
                          <Copy className="size-4" aria-hidden="true" />
                        )}
                      </IconAction>
                      <IconAction
                        label={`Eliminar invitación de ${invitation.guestName}`}
                        onClick={() => setDeleting(invitation)}
                        danger
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InvitationFormModal
        open={formOpen}
        invitation={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => router.refresh()}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar invitación"
        description={
          deleting
            ? `Se eliminará la invitación de ${deleting.guestName} y su confirmación. Esta acción no se puede deshacer.`
            : undefined
        }
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={busy} onClick={confirmDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function IconAction({
  label,
  children,
  onClick,
  href,
  danger = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = [
    "inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-200",
    danger
      ? "text-ink-500 hover:bg-blush-200/70 hover:text-blush-500"
      : "text-ink-500 hover:bg-cream-200 hover:text-olive-700",
  ].join(" ");

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}
