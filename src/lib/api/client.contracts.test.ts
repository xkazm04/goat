import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { API_RESPONSE_CONTRACTS } from './client';

/**
 * API_RESPONSE_CONTRACTS is a hand-maintained list, and the question a
 * hand-maintained list must answer is: what enumerates the ground truth, and
 * is the check derived from that or from the list? Here the ground truth is
 * the set of route files under src/app/api. Before this test, 4 of 16 keys
 * named routes that do not exist (`GET /top/items/trending`,
 * `POST /top/research`, `POST /top/research/validate`, `GET /users/me`) — a
 * dev-mode assertion that could never fire, documenting an API surface the
 * app does not serve.
 *
 * Negative control (2026-09-05): with `['GET /users/me', 'raw']` re-added to
 * the map, the existence case fails naming that key and the verb case fails on
 * the missing file. 2 red / 1 green.
 *
 * The check assumes the default base `/api` (NEXT_PUBLIC_API_URL unset, as in
 * .env.example). A deployment pointing the client at an external backend is
 * out of this test's population, and says so here rather than pretending.
 */

const API_ROOT = path.resolve(process.cwd(), 'src/app/api');
const CONTRACT_KEYS = Array.from(API_RESPONSE_CONTRACTS.keys());

function routeFileFor(contractPath: string): string {
  return path.join(API_ROOT, ...contractPath.replace(/^\//, '').split('/'), 'route.ts');
}

describe('API_RESPONSE_CONTRACTS is grounded in the route tree', () => {
  it('every registered key names a route file that exists', () => {
    const missing = CONTRACT_KEYS.filter((key) => {
      const [, contractPath] = key.split(' ');
      return !existsSync(routeFileFor(contractPath));
    });
    expect(missing).toEqual([]);
  });

  it('every registered key uses the exact "METHOD /path" shape the matcher reads', () => {
    for (const key of CONTRACT_KEYS) {
      expect(key).toMatch(/^(GET|POST|PUT|PATCH|DELETE) \/[a-z0-9/-]+$/);
    }
  });

  it('every registered route file exports the HTTP verb the key declares', () => {
    for (const key of CONTRACT_KEYS) {
      const [verb, contractPath] = key.split(' ');
      const source = readFileSync(routeFileFor(contractPath), 'utf8')
        // strip comments so a route that only TALKS about a verb does not pass
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(source, `${key} -> ${routeFileFor(contractPath)}`).toMatch(
        new RegExp(`export\\s+(async\\s+)?(function\\s+${verb}\\b|const\\s+${verb}\\b)`),
      );
    }
  });
});
