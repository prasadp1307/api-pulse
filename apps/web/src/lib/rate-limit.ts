import { getRedis } from "./redis";

const WINDOW_SEC = Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100);

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function rateLimit(key: string): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `rl:${key}:${Math.floor(now / WINDOW_SEC)}`;

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, WINDOW_SEC);
    }
    const resetAt = (Math.floor(now / WINDOW_SEC) + 1) * WINDOW_SEC;
    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetAt,
    };
  } catch {
    return { allowed: true, remaining: MAX_REQUESTS, resetAt: now + WINDOW_SEC };
  }
}
