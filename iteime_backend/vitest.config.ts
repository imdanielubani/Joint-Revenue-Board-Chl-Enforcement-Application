import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The database tests share one test database, so files run one at a time.
    fileParallelism: false,
  },
});
