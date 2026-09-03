import { requireSession } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";
import { createInvitation, listInvitations } from "@/lib/services/invitations";
import { createInvitationSchema } from "@/lib/validations";

export async function GET() {
  try {
    await requireSession();
    return ok(await listInvitations());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = await parseBody(request, createInvitationSchema);
    return ok(await createInvitation(input), 201);
  } catch (error) {
    return handleError(error);
  }
}
