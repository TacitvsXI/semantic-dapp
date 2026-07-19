import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Integration tests spawn Anvil; run them via `test:integration`.
    testTimeout: 30_000,
  },
});
