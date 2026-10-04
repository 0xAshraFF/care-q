import { defineConfig } from 'vitest/config';

// Firestore rules tests. Needs the emulator: npm run test:rules
export default defineConfig({
  test: {
    include: ['tests/rules/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
