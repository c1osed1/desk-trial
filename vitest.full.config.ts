import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['interviewer/full-tests/**/*.test.ts', 'interviewer/full-tests/**/*.test.tsx', 'interviewer/hidden-tests/**/*.test.ts', 'interviewer/hidden-tests/**/*.test.tsx'],
    environment: 'node',
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
