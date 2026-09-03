import { CalendarDays, Clock, MapPin, Shirt, Ticket } from "lucide-react";
import type { PublicEvent, PublicInvitation } from "@/lib/types";

/**
 * Bloque tipográfico de la invitación: nombre del evento, fecha, hora,
 * ubicación, dress code y pases. Es solo presentación —no conoce el RSVP—,
 * de ahí que el llamador inyecte el CTA.
 */
export function InvitationInfo({
  invitation,
  action,
}: {
  invitation: PublicInvitation;
  action?: React.ReactNode;
}) {
  const { event } = invitation;
  const passLabel = invitation.guestCount === 1 ? "1 pase" : `${invitation.guestCount} pases`;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center px-[11%] py-20 text-center sm:py-20">
      <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-olive-600">
        Para
      </p>
      <p className="mt-1 font-script text-[clamp(1.55rem,7vw,2.25rem)] leading-tight text-blush-500">
        {invitation.guestName}
      </p>

      <Ornament />

      <h1 className="font-display-script text-[clamp(3.6rem,15.5vw,5.4rem)] leading-[0.85] text-forest-950">
        {event.title}
      </h1>

      {event.highlight && (
        <p className="mt-6 font-display-script text-[clamp(2.6rem,12vw,4.1rem)] leading-[0.8] text-gold-500">
          {event.highlight}
        </p>
      )}

      {event.subtitle && (
          <p className="mt- font-sans text-[9px] uppercase tracking-[0.25em] text-ink-700 sm:text-[11px]">
          {event.subtitle}
        </p>
      )}

      <Ornament />

      <dl className="grid w-full gap-2 text-center">
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} term="Fecha">
          {event.dateLabel}
        </DetailRow>

        <DetailRow icon={<Clock className="size-4" aria-hidden="true" />} term="Hora">
          {event.time}
        </DetailRow>

        <DetailRow
          icon={<MapPin className="size-4" aria-hidden="true" />}
          term="Lugar"
          hint={Boolean(event.locationUrl)}
        >
          <LocationValue event={event} />
        </DetailRow>

        {event.dressCode && (
          <DetailRow
            icon={<Shirt className="size-4" aria-hidden="true" />}
            term="Dress code"
            hint={Boolean(event.dressCodeUrl)}
          >
            {event.dressCodeUrl ? (
              <a
                href={event.dressCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-gold-400 decoration-1 underline-offset-4 transition-colors hover:text-gold-600"
              >
                {event.dressCode}
              </a>
            ) : (
              event.dressCode
            )}
          </DetailRow>
        )}

        <DetailRow icon={<Ticket className="size-4" aria-hidden="true" />} term="Pases">
          {passLabel}
        </DetailRow>
      </dl>

      {invitation.personalMessage && (
        <p className="mt-3 max-w-[30ch] font-serif text-sm italic leading-relaxed text-ink-700">
          “{invitation.personalMessage}”
        </p>
      )}

      {action && <div className="mt-4 flex w-full justify-center">{action}</div>}
    </div>
  );
}

function LocationValue({ event }: { event: PublicEvent }) {
  const lines = event.location.split("\n").filter(Boolean);
  const content = (
    <span className="block">
      {lines.map((line, index) => (
        <span
          key={line}
          className={index === 0 ? "block" : "block text-[13px] text-ink-500"}
        >
          {line}
        </span>
      ))}
    </span>
  );

  if (!event.locationUrl) return content;

  return (
    <a
      href={event.locationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block underline decoration-gold-400 decoration-1 underline-offset-4 transition-colors hover:text-gold-600"
    >
      {content}
    </a>
  );
}

function DetailRow({
  icon,
  term,
  children,
  hint = false,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
  hint?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dt className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.24em] text-olive-600">
        <span className="text-sage-400">{icon}</span>
        {term}
      </dt>
      <dd className="relative font-serif text-lg leading-snug text-ink-900">
        {children}
        {hint && <ClickHint />}
      </dd>
    </div>
  );
}

/**
 * Anotación a lápiz que delata que el dato de arriba es un enlace: sin ella,
 * el subrayado dorado pasa por decoración y nadie toca el mapa ni el dress code.
 * Es decorativa —el enlace ya se anuncia solo— así que se oculta a lectores de
 * pantalla y no intercepta el toque.
 */
function ClickHint() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 -ml-1 flex -translate-y-1/2 select-none items-center gap-0.5 whitespace-nowrap text-ink-500/70"
    >
      <svg viewBox="0 0 46 40" className="h-6 w-10 shrink-0" role="presentation">
        <path
          d="M44 28 C39 29 35 25 33 20 A11 11 0 0 1 11 18 A8 8 0 0 1 27 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="0.8 3.2"
        />
      </svg>
      <span className="-rotate-3 font-hand text-sm leading-none">click me</span>
    </span>
  );
}

/** Filete decorativo con hoja central. */
function Ornament() {
  return (
    <svg
      viewBox="0 0 200 20"
      className="my-[clamp(0.5rem,2vh,0.85rem)] h-3 w-32 text-gold-400 sm:h-4 sm:w-40"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M6 10 H80" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M120 10 H194" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M100 2 C 110 6 112 12 100 18 C 88 12 90 6 100 2 Z"
        fill="currentColor"
        opacity="0.75"
      />
      <path d="M100 3 V17" stroke="var(--color-cream-100)" strokeWidth="0.8" />
      <circle cx="86" cy="10" r="2" fill="currentColor" />
      <circle cx="114" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}
