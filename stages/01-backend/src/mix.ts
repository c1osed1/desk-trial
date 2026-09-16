import { AppError } from './errors.ts';

export function mixSignals(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  if (rows === 0) return [];

  const inner = a[0].length;
  if (inner !== b.length) {
    throw new AppError('validation', 'mixSignals: shape mismatch');
  }

  for (const row of a) {
    if (row.length !== inner) throw new AppError('validation', 'mixSignals: ragged a');
  }

  const cols = b.length === 0 ? 0 : b[0].length;

  for (const row of b) {
    if (row.length !== cols) throw new AppError('validation', 'mixSignals: ragged b');
  }

  if (cols === 0) return a.map(() => []);

  const out: number[][] = [];

  for (let i = 0; i < rows; i += 1) {
    const row = new Array<number>(cols).fill(0);
    for (let k = 0; k < inner; k += 1) {
      for (let j = 0; j < cols; j += 1) {
        row[j] += a[i][k] * b[k][j];
      }
    }

    out.push(row);
  }

  return out;
}
