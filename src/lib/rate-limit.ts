import { headers } from "next/headers";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Sliding-window limits on LLM-backed calls (SPEC §7): 10/hour per IP when
 * anonymous, 30/day per user when signed in. Backed by Postgres, so it holds
 * across serverless instances without extra infrastructure.
 */

const LIMITS = {
  anonymous: { max: 10, windowMs: 60 * 60 * 1000, period: "hour" },
  user: { max: 30, windowMs: 24 * 60 * 60 * 1000, period: "day" },
} as const;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterS: number; message: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Counts this call against the caller's window, or refuses it. */
export async function checkRateLimit(userId: string | null): Promise<RateLimitResult> {
  if (env.RATE_LIMIT_DISABLED) return { ok: true };

  const limit = userId ? LIMITS.user : LIMITS.anonymous;
  const key = userId ? `user:${userId}` : `ip:${await clientIp()}`;
  const since = new Date(Date.now() - limit.windowMs);

  const hits = await db.rateLimitHit.findMany({
    where: { key, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
    take: limit.max,
  });

  if (hits.length >= limit.max) {
    const oldest = hits[0]!.createdAt.getTime();
    const retryAfterS = Math.max(1, Math.ceil((oldest + limit.windowMs - Date.now()) / 1000));
    console.warn(`[rate-limit] ${key} over ${limit.max}/${limit.period}`);
    return {
      ok: false,
      retryAfterS,
      message: userId
        ? "That's a lot of movie nights for one day! Your picks will be ready again tomorrow."
        : "That's a lot of movie nights! Take a breather and try again in a bit — or sign in for more picks.",
    };
  }

  await db.rateLimitHit.create({ data: { key } });
  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.02) {
    await db.rateLimitHit.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - LIMITS.user.windowMs) } },
    });
  }
  return { ok: true };
}
