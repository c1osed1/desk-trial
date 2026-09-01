import type { RateLimitResult } from './types.ts';
import type { RedisLike } from './redisLike.ts';

export class FixedWindowRateLimiter {
  constructor(
    _redis: RedisLike,
    _opts: { limit: number; windowSec: number },
  ) {
    throw new Error('TODO: implement FixedWindowRateLimiter');
  }

  async hit(_key: string): Promise<RateLimitResult> {
    throw new Error('TODO: implement hit');
  }
}
