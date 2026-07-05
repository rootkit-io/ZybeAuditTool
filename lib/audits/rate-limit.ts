import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number; retryAfterSeconds?: never }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSeconds: number };

export type RateLimiter = {
  check(key: string, limit?: number, windowMs?: number): Promise<RateLimitResult>;
};

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(key: string, limit = 8, windowMs = 60_000) {
  return createRateLimiterFromEnv().check(key, limit, windowMs);
}

export function createRateLimiterFromEnv(): RateLimiter {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRateLimiter(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    );
  }

  return new MemoryRateLimiter();
}

export class MemoryRateLimiter implements RateLimiter {
  async check(key: string, limit = 8, windowMs = 60_000) {
    const now = Date.now();
    pruneExpiredBuckets(now);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1, resetAt: now + windowMs } satisfies RateLimitResult;
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      } satisfies RateLimitResult;
    }

    existing.count += 1;
    return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt } satisfies RateLimitResult;
  }
}

export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Pick<Redis, "incr" | "pexpire" | "pttl">
  ) {}

  async check(key: string, limit = 8, windowMs = 60_000) {
    const bucketKey = `rate:${key}:${Math.floor(Date.now() / windowMs)}`;
    const count = await this.redis.incr(bucketKey);

    if (count === 1) {
      await this.redis.pexpire(bucketKey, windowMs);
    }

    const ttl = await this.redis.pttl(bucketKey);
    const ttlMs = ttl > 0 ? ttl : windowMs;
    const resetAt = Date.now() + ttlMs;

    if (count > limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000))
      } satisfies RateLimitResult;
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      resetAt
    } satisfies RateLimitResult;
  }
}

export function clearRateLimitForTests() {
  buckets.clear();
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
