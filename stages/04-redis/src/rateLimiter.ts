import type { RedisLike } from './redisLike.ts';
import type { RateLimitResult } from './types.ts';

const KEY_PREFIX = 'rl:';

/**
 * Fixed window counter, not a sliding window.
 *
 * The window is opened by the first hit (INCR creates the key, EXPIRE stamps the
 * end of the window) and lives in Redis, so the limit stays correct for parallel
 * requests: INCR is atomic and only the request that created the counter sets the
 * TTL.
 */
export class FixedWindowRateLimiter {
  private readonly redis: RedisLike;
  private readonly limit: number;
  private readonly windowSec: number;

  constructor(redis: RedisLike, opts: { limit: number; windowSec: number }) {
    this.redis = redis;
    this.limit = opts.limit;
    this.windowSec = opts.windowSec;
  }

  async hit(key: string): Promise<RateLimitResult> {
    const redisKey = `${KEY_PREFIX}${key}`;

    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, this.windowSec);
    }

    const allowed = count <= this.limit;
    const ttl = await this.redis.ttl(redisKey);

    return {
      allowed,
      remaining: Math.max(0, this.limit - count),
      retryAfterSec: allowed ? 0 : ttl > 0 ? ttl : this.windowSec,
    };
  }
}
