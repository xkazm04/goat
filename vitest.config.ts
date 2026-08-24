import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit-test runner for this repo.
 *
 * `npm test` runs THIS. The Playwright browser suite keeps its own name
 * (`npm run test:e2e`) — two harnesses with two populations, so a green
 * report always says which one was walked. Before 2026-08-24 there was no
 * unit runner at all and three files in src/ were named `*.test.*` without
 * one; see .ai/registry-conformance.md (test-harness/negative-control-tests).
 *
 * The `include` glob deliberately excludes `e2e/` — Playwright's specs are
 * not vitest specs, and a runner that swallowed them would report a
 * population it cannot actually execute.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**', '.next/**'],
    // A run that executed zero files is a broken instrument, not a pass.
    // Without this, deleting/renaming the last spec would leave `npm test`
    // green over an empty population.
    passWithNoTests: false,
    // A file that needs a DOM opts in with `// @vitest-environment jsdom`
    // at the top rather than the whole suite paying for one.
  },
});
