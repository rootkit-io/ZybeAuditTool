import { afterEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitForTests, createRateLimiterFromEnv, MemoryRateLimiter, UpstashRateLimiter } from "@/lib/audits/rate-limit";

describe("rate limit abstraction", () => {
  afterEach(() => {
    clearRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("uses memory limiter by default", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    expect(createRateLimiterFromEnv()).toBeInstanceOf(MemoryRateLimiter);
  });

  it("limits repeated requests in memory", async () => {
    const limiter = new MemoryRateLimiter();

    await expect(limiter.check("test", 1, 60_000)).resolves.toMatchObject({ ok: true });
    await expect(limiter.check("test", 1, 60_000)).resolves.toMatchObject({
      ok: false,
      retryAfterSeconds: 60
    });
  });

  it("uses Upstash limiter when env vars are present", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    expect(createRateLimiterFromEnv()).toBeInstanceOf(UpstashRateLimiter);
  });

  it("supports Upstash-style counter checks", async () => {
    let count = 0;
    const redis = {
      incr: vi.fn(async () => {
        count += 1;
        return count;
      }),
      pexpire: vi.fn(async () => 1 as const),
      pttl: vi.fn(async () => 30_000)
    };
    const limiter = new UpstashRateLimiter(redis);

    await expect(limiter.check("test", 1, 60_000)).resolves.toMatchObject({ ok: true, remaining: 0 });
    await expect(limiter.check("test", 1, 60_000)).resolves.toMatchObject({ ok: false, retryAfterSeconds: 30 });
  });
});
