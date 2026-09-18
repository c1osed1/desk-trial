import type { RateLimitResult } from './types.ts';
import type { RedisLike } from './redisLike.ts';

export class FixedWindowRateLimiter {
  private readonly redis: RedisLike;
  private readonly limit: number;
  private readonly windowSec: number;

  constructor(
    redis: RedisLike,
    opts: { limit: number; windowSec: number },
  ) {
    this.redis = redis;
    this.limit = opts.limit;
    this.windowSec = opts.windowSec;
  }

  async hit(key: string): Promise<RateLimitResult> {
    const rlKey = `rl:${key}`;
    const count = await this.redis.incr(rlKey);
    if (count === 1) {
      await this.redis.expire(rlKey, this.windowSec);
    }
    const allowed = count <= this.limit;
    const remaining = Math.max(0, this.limit - count);
    const retryAfterSec = allowed ? 0 : await this.redis.ttl(rlKey);
    return { allowed, remaining, retryAfterSec };
  }
}