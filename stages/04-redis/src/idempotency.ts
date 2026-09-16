import { IdempotencyError, type IdempotencyBegin } from './types.ts';
import type { RedisLike } from './redisLike.ts';

export class IdempotencyStore<T> {
  private readonly redis: RedisLike;
  private readonly ttlSec: number;

  constructor(
    redis: RedisLike,
    ttlSec: number,
  ) {
    this.redis = redis;
    this.ttlSec = ttlSec;
  }

  private lockKey(key: string): string {
    return `idem:${key}:lock`;
  }

  private resultKey(key: string): string {
    return `idem:${key}:res`;
  }

  async begin(key: string): Promise<IdempotencyBegin<T>> {
    const raw = await this.redis.get(this.resultKey(key));
    if (raw != null) {
      return { kind: 'replay', value: JSON.parse(raw) as T };
    }
    const acquired = await this.redis.setNxEx(this.lockKey(key), '1', this.ttlSec);
    if (!acquired) throw new IdempotencyError();
    return { kind: 'new' };
  }

  async commit(key: string, value: T): Promise<void> {
    await this.redis.setEx(this.resultKey(key), JSON.stringify(value), this.ttlSec);
    await this.redis.del(this.lockKey(key));
  }

  async fail(key: string): Promise<void> {
    await this.redis.del(this.lockKey(key));
  }
}