import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { e2eAllIds } from './seed-e2e-fixtures';

/**
 * The browser suite's STATIC contract with the app it drives.
 *
 * `npm run test:e2e` cannot run in most places this repo is checked out —
 * it needs a seeded database and a dev server — so a spec that asks for a
 * `data-testid` no component produces, hard-codes a port the config does not
 * start, or reads a list id out of an attribute that carries an array index,
 * fails only when somebody finally dispatches the manual CI job, and then
 * fails in a way that reads as "the app broke". None of those are app defects;
 * every one is a spec that has drifted from the tree, and every one is
 * decidable by reading files. This suite reads them.
 *
 * What it asserts, and the figure each assertion carried when it landed
 * (2026-09-05, e2e-browser-suite sweep):
 *   1. every test id a spec or helper asks for has a producer in src/ —
 *      9 did not (KNOWN_MISSING below, drained to [] by the fix commits);
 *   2. no spec parses a list id out of `featured-list-item-*`, whose suffix is
 *      the card's INDEX (`FeaturedListsSection.tsx`), not the list id — 3 spec
 *      files did, so 6 tests waited for `/goat?list=0`;
 *   3. no spec hard-codes a host:port — one file targeted :3001 while
 *      playwright.config.ts starts :3000.
 *
 * The registers are allowed to SHRINK only. Adding an entry is the wrong fix;
 * the right one is a producer, or a spec that reads what the app renders.
 *
 * Negative control (recorded 2026-09-05): a `getByTestId('bogus-not-real')`
 * seeded into exploratory-smoke.spec.ts turned assertion 1 red with exactly
 * that id reported; restored.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = path.join(repoRoot, 'e2e');

/** Test ids asked for by a spec that no component produces. Drains to []. */
const KNOWN_MISSING: readonly string[] = [
  'featured-list-title-*',
  'featured-lists-section-title',
  'grid-item-image-1',
  'grid-item-image-2',
  'grid-item-title-1',
  'grid-item-title-2',
  'grid-slot-empty-1',
  'match-grid-slot-1',
  'match-grid-slot-2',
];

/** Spec files that still parse a list id out of the index-bearing featured card test id. */
const KNOWN_INDEX_DERIVATIONS: readonly string[] = [
  'drag-drop-ranking.spec.ts',
  'exploratory-smoke.spec.ts',
  'helpers/test-utils.ts',
  'list-play-journey.spec.ts',
];

/** Spec files that still hard-code a host:port instead of using the config's baseURL. */
const KNOWN_HARDCODED_HOSTS: readonly string[] = [];

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const specFiles = walk(e2eDir)
  .filter((p) => /\.(spec\.ts|ts)$/.test(p) && !p.endsWith('global-setup.ts'))
  .map((p) => ({ rel: path.relative(e2eDir, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));

const producers = walk(path.join(repoRoot, 'src'))
  .filter((p) => /\.(tsx?|jsx?)$/.test(p) && !/\.test\.|\.stories\./.test(p))
  .map((p) => readFileSync(p, 'utf8'));

/** `data-testid={`stem-${x}`}` templates, as regexes over a concrete id. */
const templateProducers = producers.flatMap((s) =>
  Array.from(s.matchAll(/data-testid=\{`([^`]+)`\}|testId=\{`([^`]+)`\}/g)).map((m) => {
    const tpl = m[1] ?? m[2];
    const re = tpl
      .split(/\$\{[^}]+\}/)
      .map((lit) => lit.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('[A-Za-z0-9_]+');
    return { tpl, re: new RegExp(`^${re}$`) };
  }),
);

function hasExactProducer(id: string): boolean {
  const quoted = [`"${id}"`, `'${id}'`, '`' + id + '`'];
  if (producers.some((s) => quoted.some((q) => s.includes(q)))) return true;
  return templateProducers.some((t) => t.re.test(id));
}

/** Every `stem-${...}` template literal in src, wherever it is built (a ternary, a helper). */
const templateStems = new Set(
  producers.flatMap((s) => Array.from(s.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*-)\$\{/g)).map((m) => m[1])),
);

function hasPrefixProducer(prefix: string): boolean {
  const stem = prefix.endsWith('-') ? prefix : `${prefix}-`;
  return templateStems.has(stem);
}

/**
 * A spec that EXPLAINS a defect in a comment must not read as committing it —
 * the backlog spec's header describes the :3001 override it removed. Match
 * over code only (registry: scan-sweep §7.7, "strip comments before it matches").
 */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function requestedTestIds() {
  const exact = new Map<string, Set<string>>();
  const prefixes = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, file: string) =>
    map.set(key, (map.get(key) ?? new Set()).add(file));
  for (const { rel, text } of specFiles) {
    for (const m of text.matchAll(/getByTestId\(\s*["'`]([^"'`$]+)["'`]/g)) add(exact, m[1], rel);
    for (const m of text.matchAll(/data-testid(\^)?=\\?["']([^"'\\$]+)\\?["']/g)) {
      if (m[1]) add(prefixes, m[2], rel);
      else add(exact, m[2], rel);
    }
    // `[data-testid="featured-list-title-${listId}"]` inside a template literal
    for (const m of text.matchAll(/data-testid="([^"]*)\$\{[^}]+\}"/g)) add(prefixes, m[1], rel);
  }
  return { exact, prefixes };
}

describe('e2e suite ↔ app contract', () => {
  const { exact, prefixes } = requestedTestIds();

  it('asks for at least the test ids the journeys are known to need', () => {
    // A regex that silently matched nothing would make the assertions below
    // pass over an empty population (failure-not-empty-success).
    expect(exact.size + prefixes.size).toBeGreaterThan(40);
    expect(producers.length).toBeGreaterThan(200);
  });

  it('every test id a spec asks for has a producer in src/ (register may only shrink)', () => {
    const missing = [
      ...[...exact.keys()].filter((id) => !hasExactProducer(id)),
      ...[...prefixes.keys()].filter((p) => !hasPrefixProducer(p)).map((p) => `${p}*`),
    ].sort();
    expect(missing).toEqual([...KNOWN_MISSING].sort());
  });

  it('no spec parses a list id out of featured-list-item-* (its suffix is the card index)', () => {
    const offenders = specFiles
      .filter(({ text }) => /replace\(\s*["'`]featured-list-item-["'`]/.test(withoutComments(text)))
      .map(({ rel }) => rel)
      .sort();
    expect(offenders).toEqual([...KNOWN_INDEX_DERIVATIONS].sort());
  });

  it('no spec hard-codes a host:port — the config owns baseURL', () => {
    const offenders = specFiles
      .filter(({ text }) => /localhost:\d+/.test(withoutComments(text)))
      .map(({ rel }) => rel)
      .sort();
    expect(offenders).toEqual([...KNOWN_HARDCODED_HOSTS].sort());
  });

  it('every UUID a spec names is one the seed writes (scripts/seed-e2e-fixtures.ts)', () => {
    // Before 2026-09-05 backlog-items-loading.spec.ts addressed `06ca05fd-…`, a
    // row from one developer's database that no seed ever wrote.
    const fixtureIds = e2eAllIds();
    const foreign = specFiles.flatMap(({ rel, text }) =>
      Array.from(withoutComments(text).matchAll(UUID_RE))
        .map((m) => m[0].toLowerCase())
        .filter((id) => !fixtureIds.has(id))
        .map((id) => `${rel}: ${id}`),
    );
    expect(foreign).toEqual([]);
  });
});
