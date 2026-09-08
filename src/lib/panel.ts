import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveEvent } from "@/lib/services/events";
import type { SessionPayload } from "@/lib/session";
import type { EventRecord } from "@/lib/services/events";

export interface PanelContext {
  session: SessionPayload;
  /** Evento sobre el que trabaja el panel. null si la cuenta no tiene ninguno. */
  event: Awaited<ReturnType<typeof getActiveEvent>>;
}

/**
 * Contexto común de las pantallas del panel: quién es y sobre qué evento
 * trabaja. Todas las consultas posteriores se filtran con `session.sub`, así
 * que este es el único punto donde se resuelve la identidad.
 */
export async function requirePanelContext(): Promise<PanelContext> {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return { session, event: await getActiveEvent(session.sub) };
}

export type { EventRecord };
