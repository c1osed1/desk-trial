import type { RedisLike } from './redisLike.ts';

const VERSION_KEY = 'tickets:ver';
const LIST_PREFIX = 'tickets:list';

/**
 * Caches ticket lists behind a version counter.
 *
 * A write only bumps `tickets:ver`; stale entries are addressed by the old
 * version and disappear on their own TTL. No KEYS scan is needed on the write
 * path, and every list carries an expiry.
 */
export class TicketListCache<T> {
  private readonly redis: RedisLike;
  private readonly ttlSec: number;

  constructor(redis: RedisLike, ttlSec: number) {
    this.redis = redis;
    this.ttlSec = ttlSec;
  }

  async get(filter: string): Promise<T[] | null> {
    const raw = await this.redis.get(this.key(filter, await this.version()));
    if (raw === null) return null;

    try {
      const parsed = JSON.parse(raw) as T[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async set(filter: string, tickets: T[]): Promise<void> {
    await this.redis.setEx(
      this.key(filter, await this.version()),
      JSON.stringify(tickets),
      this.ttlSec,
    );
  }

  async invalidate(): Promise<void> {
    await this.redis.incr(VERSION_KEY);
  }

  private async version(): Promise<string> {
    return (await this.redis.get(VERSION_KEY)) ?? '0';
  }

  private key(filter: string, version: string): string {
    return `${LIST_PREFIX}:${version}:${filter}`;
  }
}
