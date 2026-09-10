import "server-only";
import { Resend } from "resend";

/**
 * Envío de correo transaccional.
 *
 * Sin RESEND_API_KEY no se rompe nada: el correo se escribe en la consola. Eso
 * permite trabajar en local —y probar el flujo completo de recuperación—
 * sin dar de alta un dominio ni gastar cuota.
 */
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Invitaciones <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

async function send(to: string, subject: string, html: string, fallbackUrl: string) {
  if (!resend) {
    // En producción esto NO puede pasar de largo. El enlace que se imprimiría
    // es el de restablecer contraseña: quien lo lea en los registros de Vercel
    // se queda con la cuenta. Mejor fallar ruidosamente que dejar la llave
    // escrita en el log.
    if (process.env.NODE_ENV === "production") {
      console.error("[correo] Falta RESEND_API_KEY en producción: no se envía nada.");
      throw new Error("No se pudo enviar el correo. Inténtalo de nuevo en un momento.");
    }

    console.info(
      `\n[correo] Sin RESEND_API_KEY, no se envía nada.\n  Para: ${to}\n  Asunto: ${subject}\n  Enlace: ${fallbackUrl}\n`
    );
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    // Se registra y se relanza: un fallo de envío en "recuperar contraseña"
    // debe llegar al usuario como error, no quedarse en silencio haciéndole
    // creer que el correo va en camino.
    console.error("[correo] falló el envío:", error);
    throw new Error("No se pudo enviar el correo. Inténtalo de nuevo en un momento.");
  }
}

/** Plantilla común: sobria y sin imágenes, que es lo que mejor entrega. */
function layout(heading: string, body: string, action: { label: string; url: string }) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:32px 16px;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141922">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #eaedf1;border-radius:8px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px 32px 8px">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6c7583">Invitaciones</p>
        <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.3">${heading}</h1>
      </td></tr>
      <tr><td style="padding:8px 32px 0;font-size:15px;line-height:1.6;color:#414a58">${body}</td></tr>
      <tr><td style="padding:24px 32px 8px">
        <a href="${action.url}" style="display:inline-block;background:#3d6597;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600">${action.label}</a>
      </td></tr>
      <tr><td style="padding:16px 32px 32px;font-size:13px;line-height:1.6;color:#6c7583">
        Si el botón no funciona, copia este enlace:<br>
        <span style="word-break:break-all;color:#3d6597">${action.url}</span>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function sendPasswordReset(to: string, url: string) {
  await send(
    to,
    "Restablece tu contraseña",
    layout(
      "Restablece tu contraseña",
      "<p style='margin:0'>Pediste cambiar la contraseña de tu panel. El enlace caduca en una hora y solo puede usarse una vez.</p><p style='margin:12px 0 0'>Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>",
      { label: "Cambiar contraseña", url }
    ),
    url
  );
}

export async function sendVerification(to: string, url: string) {
  await send(
    to,
    "Confirma tu correo",
    layout(
      "Confirma tu correo",
      "<p style='margin:0'>Ya casi. Confirma que este correo es tuyo para terminar de activar tu cuenta.</p>",
      { label: "Confirmar correo", url }
    ),
    url
  );
}

/** Escapa lo que escribió una persona antes de meterlo en la plantilla HTML. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Aviso de ticket. A diferencia de los correos de acceso, estos NO pueden
 * tumbar la operación: si Resend falla, el ticket ya está guardado y se ve en
 * el panel. Se registra y se sigue.
 */
async function notify(to: string, subject: string, html: string, url: string) {
  try {
    await send(to, subject, html, url);
  } catch (error) {
    console.error("[correo] aviso de ticket no enviado:", error);
  }
}

/** Al equipo, cuando un cliente abre un ticket o responde. */
export async function sendTicketToTeam(
  to: string,
  ticket: { subject: string; from: string; body: string; url: string; isNew: boolean }
) {
  await notify(
    to,
    `${ticket.isNew ? "Nuevo ticket" : "Respuesta"}: ${ticket.subject}`,
    layout(
      ticket.isNew ? "Nuevo ticket" : "Respuesta en un ticket",
      `<p style='margin:0'><strong>${escapeHtml(ticket.from)}</strong> escribió sobre “${escapeHtml(ticket.subject)}”.</p>
       <p style='margin:12px 0 0;white-space:pre-wrap'>${escapeHtml(ticket.body)}</p>`,
      { label: "Abrir en el panel", url: ticket.url }
    ),
    ticket.url
  );
}

/** Al cliente, cuando el equipo le responde. */
export async function sendTicketReplyToClient(
  to: string,
  ticket: { subject: string; body: string; url: string }
) {
  await notify(
    to,
    `Respondimos: ${ticket.subject}`,
    layout(
      "Tienes una respuesta",
      `<p style='margin:0'>Sobre “${escapeHtml(ticket.subject)}”:</p>
       <p style='margin:12px 0 0;white-space:pre-wrap'>${escapeHtml(ticket.body)}</p>`,
      { label: "Ver el ticket", url: ticket.url }
    ),
    ticket.url
  );
}
