import type { RedisLike } from './redisLike.ts';

export class TicketListCache<T> {
  constructor(
    private readonly redis: RedisLike,
    private readonly ttlSec: number,
  ) {}

  async get(filter: string): Promise<T[] | null> {
    const raw = await this.redis.get(await this.key(filter));
    return raw === null ? null : (JSON.parse(raw) as T[]);
  }

  async set(filter: string, tickets: T[]): Promise<void> {
    await this.redis.setEx(await this.key(filter), JSON.stringify(tickets), this.ttlSec);
  }

  async invalidate(): Promise<void> {
    await this.redis.incr('tickets:ver');
  }

  private async key(filter: string): Promise<string> {
    const version = (await this.redis.get('tickets:ver')) ?? '0';
    return `tickets:${version}:${filter}`;
  }
}
