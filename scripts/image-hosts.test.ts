import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * ONE rule — "which image hosts may the app render" — lives in
 * next.config.js `images.remotePatterns`. The maintenance scripts that decide
 * whether a stored image_url is broken MUST read that rule, not carry a copy:
 * a copy that lags treats every image on a newer host as `host-not-allowed`,
 * and `fix-broken-images.mjs --apply` then REPLACES those rows with Wikipedia
 * thumbnails. Registry: parity-auditor's class — one rule, several
 * implementations, only one of them maintained.
 *
 * Negative control (recorded 2026-09-05, before the fix): next.config.js had
 * 13 hosts, src/app/api/items/validate/route.ts 13, fix-broken-images.mjs 10,
 * validate-images.js 9. images.igdb.com, image.tmdb.org and i.scdn.co — the
 * IGDB / TMDB / Spotify sources the seeders write — were "not allowed" to both
 * scripts. The literal-list assertions below were red for both.
 */

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptsDir, '..');

const SCRIPTS_THAT_JUDGE_HOSTS = ['fix-broken-images.mjs', 'validate-images.js'];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Read the list the way the scripts do — a plain `node` require of
 * next.config.js. (Loading the Sentry-wrapped config inside vitest's module
 * graph is what the scripts never do, so it is not what this test does.)
 */
function configuredHosts(): string[] {
  const res = spawnSync(
    process.execPath,
    ['-e', "process.stdout.write(JSON.stringify(require('./next.config.js').images.remotePatterns.map(p => p.hostname)))"],
    { cwd: repoRoot, encoding: 'utf8', timeout: 30_000 },
  );
  expect(res.status, res.stderr).toBe(0);
  return JSON.parse(res.stdout) as string[];
}

describe('image-host allow-list has one source of truth', () => {
  const hosts = configuredHosts();

  it('next.config.js declares the allow-list and a script can read it', () => {
    expect(hosts.length).toBeGreaterThanOrEqual(13);
    expect(hosts).toContain('upload.wikimedia.org');
    expect(new Set(hosts).size).toBe(hosts.length);
  });

  for (const script of SCRIPTS_THAT_JUDGE_HOSTS) {
    it(`${script} reads remotePatterns instead of carrying a host list`, () => {
      const src = stripComments(readFileSync(path.join(scriptsDir, script), 'utf8'));
      expect(src).toMatch(/remotePatterns/);
      // A literal host from the config appearing in the script IS a copy.
      const copied = hosts.filter((h) => src.includes(`'${h}'`) || src.includes(`"${h}"`));
      expect(copied).toEqual([]);
    });
  }
});
