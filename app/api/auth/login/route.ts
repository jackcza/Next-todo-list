import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { clearRateLimit, getClientIp, hitRateLimits, tooManyRequests } from "@/lib/rate-limit";

const WINDOW_SECONDS = 15 * 60;
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 10;

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Incorrect email or password.", 401);

  const emailKey = `login:email:${email}`;
  const retryAfter = await hitRateLimits([
    { key: `login:ip:${getClientIp(request)}`, limit: MAX_PER_IP, windowSeconds: WINDOW_SECONDS },
    { key: emailKey, limit: MAX_PER_EMAIL, windowSeconds: WINDOW_SECONDS },
  ]);
  if (retryAfter) return tooManyRequests(retryAfter);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError("Incorrect email or password.", 401);
  }

  await clearRateLimit(emailKey);
  await createSession(user.id);
  return Response.json({ email: user.email });
}
