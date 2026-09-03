import Image from "next/image";
import type { ReactNode } from "react";
import { InvitationInfo } from "@/components/invitation/InvitationInfo";
import type { PublicInvitation } from "@/lib/types";

/**
 * La pieza central: una lámina de papel ilustrada con un marco de jardín de
 * hadas. El centro se mantiene despejado para que los datos sigan siendo HTML
 * legible y personalizados para cada invitada.
 *
 * Si el evento tiene `invitationImage`, esa ilustración encabeza la lámina con
 * su proporción original (nunca se deforma) y la tipografía la acompaña debajo.
 * Sin imagen, el marco vegetal dibujado sostiene toda la estética.
 */
export function InvitationCard({
  invitation,
  action,
}: {
  invitation: PublicInvitation;
  action?: ReactNode;
}) {
  const { invitationImage } = invitation.event;

  return (
    <article
      className={[
        "relative isolate w-full max-w-[27rem] overflow-hidden bg-cream-100",
        "rounded-[10px] border border-cream-300/80",
        "shadow-[0_2px_6px_rgba(8,14,7,0.28),0_28px_70px_-22px_rgba(8,14,7,0.85)]",
      ].join(" ")}
    >
      <Image
        src="/images/fairy-garden-invitation-frame.png"
        alt=""
        fill
        priority
        sizes="(max-width: 640px)"
        className="pointer-events-none object-cover object-center"
      />

      {/* Velo de papel: sostiene contraste en la zona destinada al texto.
          Cubre hasta cerca del borde para que el nombre (arriba) y el botón
          de RSVP (abajo) sigan siendo legibles sobre la ilustración. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(253,250,243,0.8) 0%, rgba(253,250,243,0.58) 60%, rgba(253,250,243,0.15) 92%, transparent 100%)",
        }}
      />

      {/* Filete dorado interior */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[10px] z-20 rounded-[4px] border border-gold-400/45"
      />

      {invitationImage && (
        <div className="relative z-10 px-[18px] pt-[18px]">
          <Image
            src={invitationImage}
            alt={`Invitación de ${invitation.event.name}`}
            width={1200}
            height={1600}
            priority
            sizes="(max-width: 640px) 92vw, 27rem"
            className="h-auto w-full rounded-[4px] object-contain"
          />
        </div>
      )}

      <InvitationInfo invitation={invitation} action={action} />
    </article>
  );
}
