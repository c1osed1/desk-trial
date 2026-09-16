import { IdempotencyError } from './types.ts';
import type { IdempotencyBegin } from './types.ts';
import type { RedisLike } from './redisLike.ts';

type Envelope<T> = { state: 'pending' } | { state: 'done'; value: T };

export class IdempotencyStore<T> {
  constructor(
    private readonly redis: RedisLike,
    private readonly ttlSec: number,
  ) {}

  async begin(key: string): Promise<IdempotencyBegin<T>> {
    const redisKey = `idem:${key}`;
    const pending = JSON.stringify({ state: 'pending' });

    if (await this.redis.setNxEx(redisKey, pending, this.ttlSec)) {
      return { kind: 'new' };
    }

    const raw = await this.redis.get(redisKey);
    if (raw === null) {
      throw new IdempotencyError();
    }

    const envelope = JSON.parse(raw) as Envelope<T>;
    if (envelope.state === 'done') {
      return { kind: 'replay', value: envelope.value };
    }

    throw new IdempotencyError();
  }

  async commit(key: string, value: T): Promise<void> {
    const envelope: Envelope<T> = { state: 'done', value };
    await this.redis.setEx(`idem:${key}`, JSON.stringify(envelope), this.ttlSec);
  }

  async fail(key: string): Promise<void> {
    await this.redis.del(`idem:${key}`);
  }
}
