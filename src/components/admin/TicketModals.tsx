"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { TicketDraft } from "@/components/admin/TicketBoard";
import type { AdminTicket } from "@/lib/admin-ticket";
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  createTicketSchema,
  ticketMessageSchema,
  type CreateTicketInput,
  type TicketMessageInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

/** Alta de ticket. Solo el cliente abre tickets; el equipo responde. */
export function NewTicketModal({
  open,
  events,
  draft,
  onClose,
  onSaved,
}: {
  open: boolean;
  events: { id: string; name: string }[];
  draft?: TicketDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Montaje condicional: el formulario arranca siempre con el borrador que
  // llegue, sin resetear a mano.
  if (!open) return null;
  return <NewTicketForm events={events} draft={draft} onClose={onClose} onSaved={onSaved} />;
}

function NewTicketForm({
  events,
  draft,
  onClose,
  onSaved,
}: {
  events: { id: string; name: string }[];
  draft?: TicketDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: draft?.subject ?? "",
      category: draft?.category ?? "OTHER",
      eventId: draft?.eventId ?? "",
      body: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setServerError(payload?.error ?? "No se pudo abrir el ticket");
      return;
    }

    onSaved();
    onClose();
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Abrir ticket"
      description="Cuéntanos qué necesitas. Te respondemos aquí mismo y te avisamos por correo."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Asunto" htmlFor="ticket-subject" error={errors.subject?.message}>
          <Input
            id="ticket-subject"
            placeholder="Necesito mover la fecha de mi evento"
            aria-invalid={Boolean(errors.subject)}
            {...register("subject")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tema" htmlFor="ticket-category" error={errors.category?.message}>
            <select
              id="ticket-category"
              className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 font-sans text-sm text-ink-900 transition-colors focus:border-olive-600 focus:outline-none"
              {...register("category")}
            >
              {TICKET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {TICKET_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Evento"
            htmlFor="ticket-event"
            error={errors.eventId?.message}
            hint="Opcional. Ayuda a que no preguntemos de cuál se trata."
          >
            <select
              id="ticket-event"
              className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 font-sans text-sm text-ink-900 transition-colors focus:border-olive-600 focus:outline-none"
              {...register("eventId")}
            >
              <option value="">Ninguno en particular</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Mensaje" htmlFor="ticket-body" error={errors.body?.message}>
          <Textarea
            id="ticket-body"
            rows={5}
            placeholder="La fiesta se movió a diciembre por el salón. ¿Pueden cambiarme la fecha?"
            aria-invalid={Boolean(errors.body)}
            {...register("body")}
          />
        </Field>

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
            Enviar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** El hilo, con la caja de respuesta y el botón de cerrar o reabrir. */
export function TicketThreadModal({
  ticket,
  team,
  onClose,
  onSaved,
}: {
  ticket: AdminTicket | null;
  team: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!ticket) return null;
  return <TicketThread ticket={ticket} team={team} onClose={onClose} onSaved={onSaved} />;
}

function TicketThread({
  ticket,
  team,
  onClose,
  onSaved,
}: {
  ticket: AdminTicket;
  team: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketMessageInput>({
    resolver: zodResolver(ticketMessageSchema),
    defaultValues: { body: "" },
  });

  const closed = ticket.status === "CLOSED";

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/tickets/${ticket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setServerError(payload?.error ?? "No se pudo enviar el mensaje");
      return;
    }

    reset({ body: "" });
    onSaved();
  });

  const moveDate = async () => {
    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setServerError(payload?.error ?? "No se pudo mover la fecha");
        return;
      }
      setNewDate("");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: "CLOSED" | "OPEN") => {
    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setServerError("No se pudo cambiar el estado del ticket");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.subject}
      description={[
        team ? ticket.ownerName : null,
        ticket.eventName,
        `Abierto el ${ticket.createdAtLabel}`,
      ]
        .filter(Boolean)
        .join(" · ")}
      className="sm:max-w-2xl"
    >
      <div className="space-y-5">
        <ul className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-2xl border p-4",
                // El equipo a un lado y el cliente al otro: en un hilo de tres
                // mensajes ya cuesta seguir quién dijo qué.
                message.fromTeam
                  ? "ml-6 border-olive-600/25 bg-olive-600/6"
                  : "mr-6 border-cream-200 bg-cream-50"
              )}
            >
              <p className="font-sans text-[11px] uppercase tracking-wide text-ink-500">
                {message.fromTeam ? "Equipo" : message.authorEmail} · {message.atLabel}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-700">
                {message.body}
              </p>
            </li>
          ))}
        </ul>

        {/* La válvula de escape, donde tiene sentido usarla: sobre el ticket que
            la pidió, y solo para el equipo. Sin esto, "abre un ticket y la
            movemos nosotros" sería una promesa que el panel no puede cumplir. */}
        {team && ticket.eventId && (
          <div className="rounded-2xl border border-gold-400/40 bg-gold-500/8 p-4">
            <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
              Mover la fecha de {ticket.eventName}
            </p>
            <p className="mt-1 font-sans text-xs text-ink-500">
              Sin límite de ventana. Se anota en el hilo y al cliente le vuelve a quedar su
              cambio disponible desde la fecha nueva.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(fieldEvent) => setNewDate(fieldEvent.target.value)}
                className="max-w-44"
                aria-label="Fecha nueva del evento"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={busy}
                disabled={!newDate}
                onClick={moveDate}
              >
                Mover fecha
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Field label="Responder" htmlFor="ticket-reply" error={errors.body?.message}>
            <Textarea
              id="ticket-reply"
              rows={3}
              placeholder={closed ? "Escribir reabre el ticket" : "Escribe tu respuesta…"}
              aria-invalid={Boolean(errors.body)}
              {...register("body")}
            />
          </Field>

          {serverError && (
            <p role="alert" className="rounded-xl bg-blush-200/60 px-4 py-3 text-sm text-blush-500">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {closed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={busy}
                onClick={() => setStatus("OPEN")}
              >
                Reabrir
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={busy}
                onClick={() => setStatus("CLOSED")}
                icon={<Check className="size-4" aria-hidden="true" />}
              >
                Marcar resuelto
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              icon={<Send className="size-4" aria-hidden="true" />}
            >
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
