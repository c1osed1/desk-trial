import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        test: {
          name: 'backend',
          include: ['stages/01-backend/**/*.test.ts', 'stages/01-backend/**/*.test.js'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'frontend',
          include: [
            'stages/02-frontend/**/*.test.ts',
            'stages/02-frontend/**/*.test.tsx',
            'stages/02-frontend/**/*.test.js',
          ],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'database',
          include: ['stages/03-database/**/*.test.ts', 'stages/03-database/**/*.test.js'],
          environment: 'node',
          testTimeout: 20_000,
        },
      },
      {
        test: {
          name: 'redis',
          include: ['stages/04-redis/**/*.test.ts', 'stages/04-redis/**/*.test.js'],
          environment: 'node',
        },
      },
    ],
  },
});
