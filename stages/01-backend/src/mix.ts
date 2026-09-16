import { AppError } from './errors.ts';

export function mixSignals(a: number[][], b: number[][]): number[][] {
  const aRows = a.length;
  const aCols = a[0]?.length ?? 0;
  const bRows = b.length;
  const bCols = b[0]?.length ?? 0;

  if (aCols !== bRows) throw new AppError('validation', 'Matrix dimensions mismatch');

  const result: number[][] = new Array(aRows);
  for (let i = 0; i < aRows; i++) {
    const row = new Array(bCols).fill(0);
    for (let k = 0; k < aCols; k++) {
      const aVal = a[i][k];
      if (aVal === 0) continue;
      const bRow = b[k];
      for (let j = 0; j < bCols; j++) {
        row[j] += aVal * bRow[j];
      }
    }
    result[i] = row;
  }
  return result;
}