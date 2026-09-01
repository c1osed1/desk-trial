import type { IdempotencyBegin } from './types.ts';
import type { RedisLike } from './redisLike.ts';

export class IdempotencyStore<T> {
  constructor(
    _redis: RedisLike,
    _ttlSec: number,
  ) {
    throw new Error('TODO: implement IdempotencyStore');
  }

  async begin(_key: string): Promise<IdempotencyBegin<T>> {
    throw new Error('TODO: implement begin');
  }

  async commit(_key: string, _value: T): Promise<void> {
    throw new Error('TODO: implement commit');
  }

  async fail(_key: string): Promise<void> {
    throw new Error('TODO: implement fail');
  }
}
