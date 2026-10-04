import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export type RateRule = { key: string; limit: number; windowSeconds: number };

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** Counts one hit per rule. Returns seconds to wait if any rule is over its limit, otherwise 0. */
export async function hitRateLimits(rules: RateRule[]) {
  const now = new Date();
  let retryAfter = 0;
  for (const { key, limit, windowSeconds } of rules) {
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    if (row.count > limit) {
      retryAfter = Math.max(retryAfter, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000));
    }
  }
  if (Math.random() < 0.01) {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  }
  return retryAfter;
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function tooManyRequests(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60);
  const response = jsonError(
    `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
    429,
  );
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}
