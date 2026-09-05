import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * No file under db/ may carry a connection string with a password in it.
 *
 * Why this exists: on 2026-09-05 three scripts in this directory each held
 * `postgresql://postgres.<ref>:<password>@<host>:5432/postgres` as a literal,
 * committed in 4d4c14c (2026-03-24). Nothing in the repo could see it — eslint
 * runs over `src` only, knip's project is `src`, and no secret scanner runs in
 * CI — so the first instrument is this test. It reads the files with comments
 * stripped FIRST, so a comment that explains the rule cannot satisfy it
 * (scan-sweep §7.7), and it walks the directory rather than a list of files,
 * so a fourth script cannot arrive un-scanned.
 *
 * Negative control (recorded 2026-09-05): against the pre-fix tree the
 * assertion reported all three scripts; seeding
 * `const u = 'postgres://a:b@c/d';` into connection.js turned it red again.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const dbRoot = path.resolve(here, '..');

/** userinfo with a password: scheme://user:secret@host */
const CREDENTIAL_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s'"/:@]+:[^\s'"/@]+@/i;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/--[^\n]*/g, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs|ts|sql|md)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) out.push(p);
  }
  return out;
}

describe('db/ carries no committed credential', () => {
  const files = walk(dbRoot);

  it('walks a plausible population', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('no file contains a scheme://user:password@ URL once comments are stripped', () => {
    const offenders = files.filter((f) => CREDENTIAL_URL.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => path.relative(dbRoot, f))).toEqual([]);
  });

  it('the matcher itself still bites (a seeded literal is caught)', () => {
    expect(CREDENTIAL_URL.test(stripComments("const u = 'postgres://a:b@c/d';"))).toBe(true);
    // ...and a URL without a password is not a credential.
    expect(CREDENTIAL_URL.test('https://en.wikipedia.org/w/api.php')).toBe(false);
  });
});
