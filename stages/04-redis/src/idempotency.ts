import type { RedisLike } from './redisLike.ts';
import { IdempotencyError, type IdempotencyBegin } from './types.ts';

const KEY_PREFIX = 'idem:';

type PendingState = { status: 'pending' };
type DoneState<T> = { status: 'done'; value: T };
type StoredState<T> = PendingState | DoneState<T>;

/**
 * Idempotency guard with three states: not started, in progress, completed.
 *
 * `begin` claims the key with SET NX so two parallel requests with the same key
 * cannot both start; the loser either replays the stored answer or is rejected
 * with `IdempotencyError`. A failed operation releases the key, so the same
 * request can be retried instead of being stuck in progress forever.
 */
export class IdempotencyStore<T> {
  private readonly redis: RedisLike;
  private readonly ttlSec: number;

  constructor(redis: RedisLike, ttlSec: number) {
    this.redis = redis;
    this.ttlSec = ttlSec;
  }

  async begin(key: string): Promise<IdempotencyBegin<T>> {
    const redisKey = this.redisKey(key);

    const known = await this.read(redisKey);
    if (known?.status === 'done') return { kind: 'replay', value: known.value };
    if (known?.status === 'pending') throw new IdempotencyError();

    const claimed = await this.redis.setNxEx(
      redisKey,
      JSON.stringify({ status: 'pending' } satisfies PendingState),
      this.ttlSec,
    );
    if (claimed) return { kind: 'new' };

    // somebody claimed the key between the read and the SET NX
    const raced = await this.read(redisKey);
    if (raced?.status === 'done') return { kind: 'replay', value: raced.value };
    throw new IdempotencyError();
  }

  async commit(key: string, value: T): Promise<void> {
    const state: DoneState<T> = { status: 'done', value };
    await this.redis.setEx(this.redisKey(key), JSON.stringify(state), this.ttlSec);
  }

  async fail(key: string): Promise<void> {
    // releasing the key keeps a failed operation retryable
    await this.redis.del(this.redisKey(key));
  }

  private redisKey(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }

  private async read(redisKey: string): Promise<StoredState<T> | null> {
    const raw = await this.redis.get(redisKey);
    if (raw === null) return null;

    try {
      const parsed = JSON.parse(raw) as StoredState<T>;
      if (parsed?.status === 'pending' || parsed?.status === 'done') return parsed;
      return null;
    } catch {
      return null;
    }
  }
}
