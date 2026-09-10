import { NextResponse } from "next/server";
import { trackInvitationView } from "@/lib/services/invitations";

type Params = { params: Promise<{ evento: string; slug: string }> };

/**
 * El invitado abrió su invitación.
 *
 * Lo llama el navegador, no el render: los previsualizadores de enlaces piden
 * el HTML para la miniatura y contarlos haría creer al anfitrión que su
 * invitado ya la vio. Los bots no ejecutan JavaScript, así que este dato es
 * limpio.
 *
 * Responde 204 siempre, incluso si el slug no existe: es una ruta pública y no
 * tiene por qué servir para averiguar qué invitaciones hay.
 */
export async function POST(_request: Request, { params }: Params) {
  const { evento, slug } = await params;
  await trackInvitationView(evento, slug);
  return new NextResponse(null, { status: 204 });
}
