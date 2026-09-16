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

  private storageKey(key: string): string {
    return `idem:${key}`;
  }

  async begin(key: string): Promise<IdempotencyBegin<T>> {
    const storageKey = this.storageKey(key);
    const raw = await this.redis.get(storageKey);
    if (raw != null) {
      if (raw === 'pending') throw new IdempotencyError();
      return { kind: 'replay', value: JSON.parse(raw) as T };
    }
    const acquired = await this.redis.setNxEx(storageKey, 'pending', this.ttlSec);
    if (!acquired) throw new IdempotencyError();
    return { kind: 'new' };
  }

  async commit(key: string, value: T): Promise<void> {
    await this.redis.setEx(this.storageKey(key), JSON.stringify(value), this.ttlSec);
  }

  async fail(key: string): Promise<void> {
    await this.redis.del(this.storageKey(key));
  }
}