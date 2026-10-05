import { normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { clearRateLimit, getClientIp, hitRateLimits, tooManyRequests } from "@/lib/rate-limit";

const WINDOW_SECONDS = 15 * 60;
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 10;

/** Rate-limited email + password check. Returns the user, or an error response to send back. */
export async function verifyLogin(request: Request) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return { error: jsonError("Incorrect email or password.", 401) };

  const emailKey = `login:email:${email}`;
  const retryAfter = await hitRateLimits([
    { key: `login:ip:${getClientIp(request)}`, limit: MAX_PER_IP, windowSeconds: WINDOW_SECONDS },
    { key: emailKey, limit: MAX_PER_EMAIL, windowSeconds: WINDOW_SECONDS },
  ]);
  if (retryAfter) return { error: tooManyRequests(retryAfter) };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: jsonError("Incorrect email or password.", 401) };
  }

  await clearRateLimit(emailKey);
  return { user };
}
