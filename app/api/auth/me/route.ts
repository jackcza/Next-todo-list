import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);
  return Response.json(user);
}
