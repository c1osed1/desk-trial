export class IdempotencyError extends Error {
  readonly code: 'in_progress';

  constructor(message = 'Request is already in progress') {
    super(message);
    this.name = 'IdempotencyError';
    this.code = 'in_progress';
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export type IdempotencyBegin<T> = { kind: 'new' } | { kind: 'replay'; value: T };
