export type RepoErrorCode = 'not_found' | 'conflict' | 'forbidden';

export class RepoError extends Error {
  readonly code: RepoErrorCode;

  constructor(code: RepoErrorCode, message: string) {
    super(message);
    this.name = 'RepoError';
    this.code = code;
  }
}
