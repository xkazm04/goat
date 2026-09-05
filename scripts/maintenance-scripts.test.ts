import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The image-maintenance scripts are run by a human at a terminal, and the only
 * thing the terminal reads reliably is the exit code. Registry:
 * quality-gates/gate-liveness — a run that fails and exits 0 is
 * indistinguishable from a run that succeeded.
 *
 * Negative control (recorded 2026-09-05, before the fix): every script below
 * ended in `main().catch(console.error)`, so a refused connection printed a
 * stack trace and exited 0 — measured 5/5 exit 0 against API_BASE pointing
 * at a port nothing listens on. The first block was red.
 */

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

/** Scripts that talk to the app's HTTP API and read API_BASE. */
const API_SCRIPTS = [
  'analyze-images.js',
  'analyze-non-whitelisted.js',
  'validate-images.js',
  'fix-game-images.js',
  'fix-sports-images.js',
];

/** Every maintenance script in this directory that has a main()/run() entry. */
const ALL_SCRIPTS = [...API_SCRIPTS, 'fix-broken-images.mjs'];

function run(script: string, env: Record<string, string>) {
  return spawnSync(process.execPath, [path.join(scriptsDir, script)], {
    cwd: scriptsDir, // no .env here: fix-broken-images must fail on credentials, not on a live DB
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('maintenance scripts exit non-zero when they fail', () => {
  for (const script of API_SCRIPTS) {
    it(`${script} exits 1 when the API is unreachable`, () => {
      // Port 1 is reserved and refused immediately; nothing here touches the network.
      const res = run(script, { API_BASE: 'http://127.0.0.1:1' });
      expect(res.status, `stdout:\n${res.stdout}\nstderr:\n${res.stderr}`).toBe(1);
    });
  }

  it('no script ends in a bare `.catch(console.error)`, which swallows the exit code', () => {
    const offenders = ALL_SCRIPTS.filter((s) =>
      /\.catch\(console\.error\)/.test(stripComments(readFileSync(path.join(scriptsDir, s), 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });
});
