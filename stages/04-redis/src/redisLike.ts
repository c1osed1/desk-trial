export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK'>;
  setEx(key: string, value: string, ttlSec: number): Promise<'OK'>;
  setNxEx(key: string, value: string, ttlSec: number): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSec: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
};

type Entry = { value: string; expiresAt: number | null };

export class MemoryRedis implements RedisLike {
  private readonly store = new Map<string, Entry>();
  private clockMs: number | null = null;

  now(): number {
    return this.clockMs ?? Date.now();
  }

  /** For tests: freeze / jump time without waiting. */
  setNow(ms: number): void {
    this.clockMs = ms;
  }

  advance(ms: number): void {
    this.setNow(this.now() + ms);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.alive(key);
    return entry ? entry.value : null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: null });
    return 'OK';
  }

  async setEx(key: string, value: string, ttlSec: number): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
    return 'OK';
  }

  async setNxEx(key: string, value: string, ttlSec: number): Promise<boolean> {
    if (this.alive(key)) return false;
    this.store.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
    return true;
  }

  async incr(key: string): Promise<number> {
    const current = this.alive(key);
    const next = Number(current?.value ?? 0) + 1;
    this.store.set(key, { value: String(next), expiresAt: current?.expiresAt ?? null });
    return next;
  }

  async expire(key: string, ttlSec: number): Promise<boolean> {
    const entry = this.alive(key);
    if (!entry) return false;
    this.store.set(key, { value: entry.value, expiresAt: this.now() + ttlSec * 1000 });
    return true;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.alive(key);
    if (!entry) return -2;
    if (entry.expiresAt == null) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - this.now()) / 1000));
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (this.store.delete(key)) n += 1;
    }
    return n;
  }

  private alive(key: string): Entry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt != null && entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }
}
