import { CODE_MINUTES, generateCode, hashCode, normalizeEmail } from "@/lib/auth";
import { RESEND_SECONDS, isCodePurpose } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { sendVerificationCode } from "@/lib/mail";
import { getClientIp, hitRateLimits, tooManyRequests } from "@/lib/rate-limit";

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const MAX_PER_IP_HOURLY = 10;
const MAX_PER_EMAIL_DAILY = 10;
// Brevo's free plan allows 300 emails a day.
const MAX_GLOBAL_DAILY = 250;

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const purpose = body.purpose ?? "register";
  if (!email) return jsonError("Please enter a valid email address.", 400);
  if (!isCodePurpose(purpose)) return jsonError("Invalid request.", 400);

  const retryAfter = await hitRateLimits([
    { key: `send-code:ip:${getClientIp(request)}`, limit: MAX_PER_IP_HOURLY, windowSeconds: HOUR },
    { key: `send-code:email:${email}`, limit: MAX_PER_EMAIL_DAILY, windowSeconds: DAY },
  ]);
  if (retryAfter) return tooManyRequests(retryAfter);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (purpose === "register" && user) {
    return jsonError("This email is already registered. Please log in.", 409);
  }
  if (purpose === "reset" && !user) {
    return jsonError("No account found with this email.", 404);
  }

  const existing = await prisma.emailCode.findUnique({ where: { email } });
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_SECONDS * 1000) {
    return jsonError("Please wait a minute before requesting another code.", 429);
  }

  const quotaExceeded = await hitRateLimits([
    { key: "send-code:global", limit: MAX_GLOBAL_DAILY, windowSeconds: DAY },
  ]);
  if (quotaExceeded) {
    return jsonError("Too many verification emails today. Please try again tomorrow.", 429);
  }

  const code = generateCode();
  const data = {
    purpose,
    codeHash: hashCode(email, code),
    attempts: 0,
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    createdAt: new Date(),
  };
  await prisma.emailCode.upsert({ where: { email }, create: { email, ...data }, update: data });
  try {
    await sendVerificationCode(email, code, purpose);
  } catch (error) {
    console.error("Failed to send verification email", error);
    await prisma.emailCode.delete({ where: { email } });
    return jsonError("Could not send the verification email. Please try again later.", 502);
  }

  return Response.json({ ok: true });
}
