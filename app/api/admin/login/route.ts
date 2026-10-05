import { createSession } from "@/lib/auth";
import { ADMIN_ROLE } from "@/lib/constants";
import { jsonError } from "@/lib/http";
import { verifyLogin } from "@/lib/login";

export async function POST(request: Request) {
  const result = await verifyLogin(request);
  if ("error" in result) return result.error;
  if (result.user.role !== ADMIN_ROLE) return jsonError("This account does not have admin access.", 403);

  await createSession(result.user.id);
  return Response.json({ email: result.user.email });
}
