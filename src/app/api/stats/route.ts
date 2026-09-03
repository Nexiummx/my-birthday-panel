import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { getDashboardStats } from "@/lib/services/stats";

export async function GET() {
  try {
    await requireSession();
    return ok(await getDashboardStats());
  } catch (error) {
    return handleError(error);
  }
}
