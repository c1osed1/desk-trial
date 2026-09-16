import type { RateLimitResult } from './types.ts';
import type { RedisLike } from './redisLike.ts';

export class FixedWindowRateLimiter {
  constructor(
    private readonly redis: RedisLike,
    private readonly opts: { limit: number; windowSec: number },
  ) {}

  async hit(key: string): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, this.opts.windowSec);
    }

    if (count <= this.opts.limit) {
      return { allowed: true, remaining: this.opts.limit - count, retryAfterSec: 0 };
    }

    const ttl = await this.redis.ttl(redisKey);
    return { allowed: false, remaining: 0, retryAfterSec: ttl > 0 ? ttl : this.opts.windowSec };
  }
}
