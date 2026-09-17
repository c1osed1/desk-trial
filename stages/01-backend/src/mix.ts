import { AppError } from './errors.ts';

function reject(message: string): never {
  throw new AppError('validation', message);
}

function assertMatrix(matrix: number[][], name: string): void {
  if (!Array.isArray(matrix)) {
    reject(`mixSignals: "${name}" must be a matrix`);
  }
  for (const row of matrix) {
    if (!Array.isArray(row)) {
      reject(`mixSignals: "${name}" must be a matrix`);
    }
    for (const value of row) {
      if (typeof value !== 'number') {
        reject(`mixSignals: "${name}" must contain numbers only`);
      }
    }
  }
}

/**
 * Plain matrix multiplication: A (m×n) × B (n×p) → m×p.
 *
 * B is flattened once so the hot loop walks contiguous memory instead of
 * chasing nested arrays; that keeps big inputs well inside the time budget.
 */
export function mixSignals(a: number[][], b: number[][]): number[][] {
  assertMatrix(a, 'a');
  assertMatrix(b, 'b');

  const rowsA = a.length;
  const rowsB = b.length;

  if (rowsA === 0) return [];

  const colsA = a[0].length;
  if (rowsB === 0) {
    if (colsA !== 0) {
      reject(`mixSignals: cannot multiply ${rowsA}×${colsA} by 0×?`);
    }
    return [];
  }

  const colsB = b[0].length;
  if (colsA !== rowsB) {
    reject(`mixSignals: cannot multiply ${rowsA}×${colsA} by ${rowsB}×${colsB}`);
  }

  const flatB = new Float64Array(rowsB * colsB);
  for (let i = 0; i < rowsB; i += 1) {
    const row = b[i];
    if (row.length !== colsB) {
      reject('mixSignals: "b" must be rectangular');
    }
    for (let j = 0; j < colsB; j += 1) {
      flatB[i * colsB + j] = row[j];
    }
  }

  const result: number[][] = new Array(rowsA);
  for (let i = 0; i < rowsA; i += 1) {
    const rowA = a[i];
    if (rowA.length !== colsA) {
      reject('mixSignals: "a" must be rectangular');
    }
    const accumulator = new Float64Array(colsB);
    for (let k = 0; k < colsA; k += 1) {
      const factor = rowA[k];
      if (factor === 0) continue;
      const base = k * colsB;
      for (let j = 0; j < colsB; j += 1) {
        accumulator[j] += factor * flatB[base + j];
      }
    }
    result[i] = Array.from(accumulator);
  }

  return result;
}
