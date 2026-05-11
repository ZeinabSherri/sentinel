import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
    redis.on("error", (err) => {
      console.error("[Redis] connection error:", err.message);
    });
  }
  return redis;
}

export const QUEUE_KEY = "sentinel:eval_queue";
export const PROCESSING_KEY = "sentinel:eval_processing";

export async function enqueue(eventId: string, payload: object): Promise<void> {
  const r = getRedis();
  await r.rpush(QUEUE_KEY, JSON.stringify({ eventId, payload, enqueuedAt: Date.now() }));
}

export async function dequeue(): Promise<{ eventId: string; payload: object } | null> {
  const r = getRedis();
  const raw = await r.lpop(QUEUE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function queueLength(): Promise<number> {
  const r = getRedis();
  return r.llen(QUEUE_KEY);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  const val = await r.get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const r = getRedis();
  await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  await r.del(key);
}
