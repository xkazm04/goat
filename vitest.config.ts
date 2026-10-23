import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit-test runner. `npm test` runs this; the Playwright smoke suite
 * (`npm run test:e2e`) is a separate harness, so a green report says which
 * population was walked.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'supabase/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**', '.next/**'],
    // A run that executed zero files is a broken instrument, not a pass.
    passWithNoTests: false,
  },
});
