"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { Camera, Sparkles } from "lucide-react";
import { Scene, SceneForeground } from "@/components/invitation/scenes/Scene";
import { InvitationCard } from "@/components/invitation/InvitationCard";
import { CURTAIN_BRANCH_CLASS } from "@/components/invitation/OpeningCurtain";
import { ThemeCurtain } from "@/components/invitation/scenes/DrapeCurtain";
import { RSVPModal } from "@/components/invitation/RSVPModal";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion, useScrollLock } from "@/lib/hooks";
import { invitationPath } from "@/lib/utils";
import type { PublicInvitation } from "@/lib/types";
import type { InvitationStatusValue } from "@/lib/validations";

type Phase = "sealed" | "opening" | "revealed";

interface RsvpState {
  status: InvitationStatusValue;
  guestCount: number;
  comment: string | null;
}

/**
 * Orquesta la experiencia pública completa: bosque → apertura → invitación.
 *
 * GSAP se reserva para la transición de apertura (una sola línea de tiempo);
 * el resto del movimiento —hojas, luciérnagas, mariposas— corre en CSS/canvas.
 */
export function InvitationExperience({ invitation }: { invitation: PublicInvitation }) {
  const [openedPhase, setPhase] = useState<Phase>("sealed");
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpState | null>(invitation.rsvp);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sealRef = useRef<HTMLDivElement | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const trackedRef = useRef(false);

  // Se avisa de que el invitado ABRIÓ su invitación. Desde el navegador y no
  // desde el servidor a propósito: WhatsApp y compañía piden el HTML para armar
  // la miniatura, y contarlos le haría creer al anfitrión que su invitado ya la
  // vio — dejaría de insistirle a quien nunca la recibió. Los bots no ejecutan
  // JavaScript, así que este dato es limpio.
  useEffect(() => {
    // El ref evita la doble llamada del modo estricto en desarrollo.
    if (trackedRef.current) return;
    trackedRef.current = true;

    const ruta = `${encodeURIComponent(invitation.event.slug)}/${encodeURIComponent(invitation.slug)}`;
    void fetch(`/api/public/invitations/${ruta}/visto`, {
      method: "POST",
      // keepalive: si cierra la invitación de inmediato, la petición sale igual.
      keepalive: true,
    }).catch(() => {
      /* que no se cuente una visita no puede romperle la invitación a nadie */
    });
  }, [invitation.event.slug, invitation.slug]);

  // Con "reducir movimiento" activo la invitación se muestra directamente:
  // estado derivado, sin efectos ni renders en cascada.
  const phase: Phase = prefersReducedMotion ? "revealed" : openedPhase;

  useScrollLock(phase !== "revealed");

  const open = useCallback(() => {
    if (phase !== "sealed") return;

    if (prefersReducedMotion) {
      setPhase("revealed");
      return;
    }

    setPhase("opening");

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => setPhase("revealed"),
      });

      timeline
        .to(sealRef.current, { opacity: 0, y: -18, duration: 0.45, ease: "power2.out" }, 0)
        // Las dos cortinas se separan desde el centro de la pantalla.
        .to(leftRef.current, { xPercent: -104, rotation: -2.5, duration: 1.7 }, 0.12)
        .to(rightRef.current, { xPercent: 104, rotation: 2.5, duration: 1.7 }, 0.12)
        // Movimiento secundario: las ramas del frente ceden con retardo.
        .to(
          gsap.utils.toArray<SVGGElement>(`.${CURTAIN_BRANCH_CLASS}`),
          {
            rotation: (index: number) => (index % 2 === 0 ? -9 : 9),
            transformOrigin: "50% 50%",
            duration: 1.35,
            stagger: 0.05,
            ease: "power2.out",
          },
          0.1
        )
        // La invitación entra con un scale-in muy contenido.
        .fromTo(
          cardRef.current,
          { opacity: 0, scale: 0.88, y: 26 },
          { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: "power2.out" },
          0.58
        );
    }, rootRef);

    return () => context.revert();
  }, [phase, prefersReducedMotion]);

  const revealed = phase === "revealed";

  const { theme, copy } = invitation.event;

  return (
    <Scene theme={theme}>
      <div ref={rootRef} className="relative min-h-dvh w-full">
        <div className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
          <div
            ref={cardRef}
            aria-hidden={phase === "sealed"}
            className="w-full max-w-[27rem]"
            style={{
              opacity: phase === "sealed" ? 0 : undefined,
              pointerEvents: revealed ? "auto" : "none",
            }}
          >
            <InvitationCard
              invitation={invitation}
              action={
                // En columna: el contenedor del CTA es una fila, y sin esto el
                // enlace de fotos se coloca al costado del botón en vez de
                // debajo, con el icono suelto entre los dos.
                <div className="flex flex-col items-center">
                  <RsvpAction
                    rsvp={rsvp}
                    onOpen={() => setRsvpOpen(true)}
                    disabled={!revealed}
                  />
                  {/* Entra por el slug y no por el código del evento: así la
                      foto queda firmada con el nombre del invitado sin
                      preguntárselo. */}
                  {invitation.event.photosEnabled && (
                    <Link
                      href={`${invitationPath(invitation.event.slug, invitation.slug)}/fotos`}
                      tabIndex={revealed ? undefined : -1}
                      className="mt-3 inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.24em] text-ink-500 underline decoration-gold-400/50 underline-offset-4 transition-colors hover:text-ink-900"
                    >
                      <Camera className="size-3.5" aria-hidden="true" />
                      Fotos de la fiesta
                    </Link>
                  )}
                </div>
              }
            />
          </div>
        </div>

        {phase !== "revealed" && (
          <ThemeCurtain theme={theme} leftRef={leftRef} rightRef={rightRef} />
        )}

        {/* Viñeta cinematográfica sobre toda la escena: oscurece las esquinas y
            concentra la mirada en el centro. El color lo pone el tema. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background:
              "radial-gradient(78% 62% at 50% 46%, transparent 42%, var(--veil) 100%)",
          }}
        />

        <SceneForeground theme={theme} />

        {phase === "sealed" && (
          <div
            ref={sealRef}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
          >
            {/* Penumbra bajo el mensaje (para que la escena no compita con el
                texto) y, sobre ella, la luz que lo realza. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(44% 30% at 50% 50%, var(--shade) 0%, color-mix(in srgb, var(--shade) 68%, transparent) 48%, transparent 78%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mix-blend-screen"
              style={{
                background: "radial-gradient(38% 26% at 50% 50%, var(--glow) 0%, transparent 72%)",
              }}
            />
            <div className="relative flex flex-col items-center">
            <p className="animate-glow-pulse font-sans text-[10px] uppercase tracking-[0.42em] text-gold-300/80">
              {copy.eyebrow}
            </p>

            <h1 className="mt-4 max-w-[16ch] font-serif text-3xl font-light leading-snug text-cream-100 drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-4xl">
              {copy.headline}
            </h1>

            <Button
              variant="gold"
              size="md"
              onClick={open}
              icon={<Sparkles className="size-4" aria-hidden="true" />}
              className="mt-6 tracking-[0.16em] uppercase text-xs"
            >
              {copy.cta}
            </Button>

            <p className="mt-4 font-sans text-xs tracking-[0.2em] text-cream-200/70">
              Para {invitation.guestName}
            </p>
            </div>
          </div>
        )}
      </div>

      <RSVPModal
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        invitation={{ ...invitation, rsvp }}
        onSuccess={setRsvp}
      />
    </Scene>
  );
}

function RsvpAction({
  rsvp,
  onOpen,
  disabled,
}: {
  rsvp: RsvpState | null;
  onOpen: () => void;
  disabled: boolean;
}) {
  const confirmed = rsvp?.status === "CONFIRMED";
  const declined = rsvp?.status === "DECLINED";

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant={rsvp ? "secondary" : "primary"}
        size="md"
        onClick={onOpen}
        disabled={disabled}
        className="w-full max-w-xs uppercase text-xs tracking-[0.18em]"
      >
        {rsvp ? "Modificar respuesta" : "Confirma tu asistencia"}
      </Button>

      {confirmed && (
        <p className="font-sans text-xs text-olive-600">
          Confirmaste {rsvp.guestCount} {rsvp.guestCount === 1 ? "persona" : "personas"}. ¡Gracias!
        </p>
      )}
      {declined && (
        <p className="font-sans text-xs text-blush-500">
          Registramos que no podrás acompañarnos.
        </p>
      )}
    </div>
  );
}
