"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Field";
import { parseGuestList } from "@/lib/validations";

const EXAMPLE = `Mariana López, 2
Carlos Hernández, 1
Ana Martínez, 4
Sofía García`;

export function ImportGuestsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // La vista previa se recalcula en cada tecla: el anfitrión ve cómo se
  // interpreta su lista antes de crear nada.
  const parsed = useMemo(() => parseGuestList(raw), [raw]);
  const valid = parsed.filter((row) => !row.error);
  const invalid = parsed.filter((row) => row.error);
  const passes = valid.reduce((total, row) => total + row.guestCount, 0);

  if (!open) return null;

  const submit = async () => {
    setServerError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/invitations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: valid.map(({ guestName, guestCount }) => ({ guestName, guestCount })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setServerError(body?.error ?? "No se pudieron importar los invitados");
        return;
      }

      setRaw("");
      onImported();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Importar invitados"
      description="Pega tu lista, un invitado por línea."
      className="sm:max-w-xl"
    >
      <div className="space-y-5">
        <Field
          label="Lista de invitados"
          htmlFor="guest-list"
          hint="Formato: nombre, pases. Si no pones número, se asume 1 pase. Puedes pegar directo desde una hoja de cálculo."
        >
          <Textarea
            id="guest-list"
            rows={9}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={EXAMPLE}
            className="font-mono text-xs"
          />
        </Field>

        {parsed.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-cream-100/60 p-4">
            <p className="font-sans text-sm text-ink-900">
              <strong className="font-semibold">{valid.length}</strong>{" "}
              {valid.length === 1 ? "invitación" : "invitaciones"} · {passes}{" "}
              {passes === 1 ? "pase" : "pases"} en total
            </p>

            {invalid.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="flex items-center gap-1.5 font-sans text-xs font-medium text-blush-500">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  {invalid.length} {invalid.length === 1 ? "línea" : "líneas"} se van a omitir
                </p>
                <ul className="space-y-0.5 font-sans text-xs text-ink-500">
                  {invalid.slice(0, 5).map((row, index) => (
                    <li key={index} className="truncate">
                      <span className="text-ink-700">{row.guestName}</span> — {row.error}
                    </li>
                  ))}
                  {invalid.length > 5 && <li>y {invalid.length - 5} más…</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {serverError && (
          <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            loading={saving}
            disabled={valid.length === 0}
            icon={<Upload className="size-4" aria-hidden="true" />}
          >
            Importar {valid.length > 0 ? valid.length : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
