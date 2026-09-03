import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublicInvitation } from "@/lib/services/invitations";
import { toPublicInvitation } from "@/lib/public-invitation";

export const alt = "Invitación · Bosque Encantado";
export const size = { width: 1200, height: 630 };
// El fondo es una acuarela: en PNG pesa más de 1 MB y WhatsApp descarta las
// miniaturas pesadas. En JPEG baja a unos 200 kB sin diferencia visible.
export const contentType = "image/jpeg";

// El nombre del invitado se puede editar desde el panel: la miniatura nunca
// debe servirse cacheada con un nombre viejo.
export const dynamic = "force-dynamic";

const asset = (...path: string[]) => join(process.cwd(), "assets", ...path);

const [frameData, pinyon, cormorant, jost] = await Promise.all([
  readFile(asset("og-frame.jpg"), "base64"),
  readFile(asset("fonts", "PinyonScript-Regular.ttf")),
  readFile(asset("fonts", "CormorantGaramond-Light.ttf")),
  readFile(asset("fonts", "Jost-Regular.ttf")),
]);

const frameSrc = `data:image/jpeg;base64,${frameData}`;

const COLOR = {
  paper: "#f8f1e2",
  forest: "#2b4220",
  olive: "#5a6b3c",
  blush: "#bd837a",
  gold: "#bd9d5a",
  ink: "#2a2c22",
  inkSoft: "#6f7263",
} as const;

const fonts = [
  { name: "Pinyon", data: pinyon, style: "normal" as const, weight: 400 as const },
  { name: "Cormorant", data: cormorant, style: "normal" as const, weight: 300 as const },
  { name: "Jost", data: jost, style: "normal" as const, weight: 400 as const },
];

/** Filete dorado con hoja central, el mismo de la invitación. */
function Ornament() {
  return (
    <svg width="230" height="18" viewBox="0 0 200 20" style={{ margin: "14px 0" }}>
      <path d="M6 10 H80" stroke={COLOR.gold} strokeWidth="1" strokeLinecap="round" />
      <path d="M120 10 H194" stroke={COLOR.gold} strokeWidth="1" strokeLinecap="round" />
      <path d="M100 2 C 110 6 112 12 100 18 C 88 12 90 6 100 2 Z" fill={COLOR.gold} />
      <circle cx="86" cy="10" r="2" fill={COLOR.gold} />
      <circle cx="114" cy="10" r="2" fill={COLOR.gold} />
    </svg>
  );
}

/**
 * Miniatura que ven los invitados al recibir el enlace por WhatsApp: el marco
 * botánico de la invitación con su nombre y los datos del evento.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getPublicInvitation(slug);
  const invitation = record ? toPublicInvitation(record) : null;
  const event = invitation?.event;

  // Un nombre largo no puede desbordar la zona despejada del marco.
  const guestName = invitation?.guestName ?? "";
  const guestSize = guestName.length > 22 ? 40 : guestName.length > 16 ? 48 : 56;
  const title = event?.title ?? "Bosque Encantado";
  const titleSize = title.length > 12 ? 76 : 108;
  const place = event?.location.split("\n")[0];

  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLOR.paper,
          fontFamily: "Cormorant",
          textAlign: "center",
        }}
      >
        <img
          src={frameSrc}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: `1px solid ${COLOR.gold}`,
            opacity: 0.5,
            borderRadius: 4,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 780,
          }}
        >
          {invitation && (
            <>
              <div
                style={{
                  fontFamily: "Jost",
                  fontSize: 15,
                  letterSpacing: 8,
                  color: COLOR.olive,
                }}
              >
                PARA
              </div>
              <div
                style={{
                  fontFamily: "Pinyon",
                  fontSize: guestSize,
                  color: COLOR.blush,
                  marginTop: 6,
                }}
              >
                {guestName}
              </div>
            </>
          )}

          <Ornament />

          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <div style={{ fontFamily: "Pinyon", fontSize: titleSize, color: COLOR.forest }}>
              {title}
            </div>
            {event?.highlight && (
              <div style={{ fontFamily: "Pinyon", fontSize: titleSize * 0.82, color: COLOR.gold }}>
                {event.highlight}
              </div>
            )}
          </div>

          {event?.subtitle && (
            <div
              style={{
                fontFamily: "Jost",
                fontSize: 15,
                letterSpacing: 6,
                color: COLOR.olive,
                marginTop: 14,
                textTransform: "uppercase",
              }}
            >
              {event.subtitle}
            </div>
          )}

          <Ornament />

          {event && (
            <div style={{ fontSize: 32, color: COLOR.ink }}>
              {`${event.dateLabel} · ${event.time}`}
            </div>
          )}
          {place && (
            <div style={{ fontSize: 25, color: COLOR.inkSoft, marginTop: 4 }}>{place}</div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts }
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": contentType },
  });
}
