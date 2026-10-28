import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  }
  return redis;
}

export const LIVE_CHANNEL = "apipulse:live:checks";

export async function publishCheckEvent(payload: object) {
  const client = getRedis();
  await client.publish(LIVE_CHANNEL, JSON.stringify(payload));
}
