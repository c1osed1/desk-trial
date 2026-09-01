import type { RedisLike } from './redisLike.ts';

export class TicketListCache<T> {
  constructor(
    _redis: RedisLike,
    _ttlSec: number,
  ) {
    throw new Error('TODO: implement TicketListCache');
  }

  async get(_filter: string): Promise<T[] | null> {
    throw new Error('TODO: implement get');
  }

  async set(_filter: string, _tickets: T[]): Promise<void> {
    throw new Error('TODO: implement set');
  }

  async invalidate(): Promise<void> {
    throw new Error('TODO: implement invalidate');
  }
}
