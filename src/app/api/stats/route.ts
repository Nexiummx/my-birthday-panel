import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { getDashboardStats } from "@/lib/services/stats";
import { getActiveEvent } from "@/lib/services/events";

export async function GET() {
  try {
    const session = await requireSession();
    const event = await getActiveEvent(session.sub);
    return ok(await getDashboardStats(session.sub, event?.id ?? null));
  } catch (error) {
    return handleError(error);
  }
}
