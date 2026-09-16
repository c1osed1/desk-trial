import type { RedisLike } from './redisLike.ts';

const VERSION_KEY = 'tickets:ver';

export class TicketListCache<T> {
  private readonly redis: RedisLike;
  private readonly ttlSec: number;

  constructor(
    redis: RedisLike,
    ttlSec: number,
  ) {
    this.redis = redis;
    this.ttlSec = ttlSec;
  }

  private async version(): Promise<number> {
    const raw = await this.redis.get(VERSION_KEY);
    return raw == null ? 0 : Number(raw) || 0;
  }

  private cacheKey(filter: string, version: number): string {
    return `tickets:list:${version}:${filter}`;
  }

  async get(filter: string): Promise<T[] | null> {
    const raw = await this.redis.get(this.cacheKey(filter, await this.version()));
    return raw == null ? null : (JSON.parse(raw) as T[]);
  }

  async set(filter: string, tickets: T[]): Promise<void> {
    await this.redis.setEx(
      this.cacheKey(filter, await this.version()),
      JSON.stringify(tickets),
      this.ttlSec,
    );
  }

  async invalidate(): Promise<void> {
    await this.redis.incr(VERSION_KEY);
  }
}