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
 *      9 did not, of which 1 (`featured-lists-section-title`) turned out to be
 *      the matcher's own false positive and 1 (`featured-list-title-*`) was
 *      removed by reading the card's accessible name instead; 7 remain in
 *      KNOWN_MISSING below, and the register drains to [];
 *   2. no spec parses a list id out of `featured-list-item-*`, whose suffix is
 *      the card's INDEX (`FeaturedListsSection.tsx`), not the list id — 4 files
 *      did, so 6 tests waited for `/goat?list=0`. Drained.
 *   3. no spec hard-codes a host:port — one file targeted :3001 while
 *      playwright.config.ts starts :3000. Drained.
 *   4. every UUID a spec names is one the seed writes.
 *
 * The registers are allowed to SHRINK only. Adding an entry is the wrong fix;
 * the right one is a producer, or a spec that reads what the app renders.
 *
 * Negative control (recorded 2026-09-05): a `getByTestId('bogus-not-real')`
 * seeded into exploratory-smoke.spec.ts turned assertion 1 red with exactly
 * that id reported; restored. Re-run the same day against the prefix-aware
 * producer matcher with both `bogus-not-real` and `bogus-not-real-section-title`
 * — the second is the shape that matcher newly resolves — and both were
 * reported; restored. Third run the same day for the composed-request path: a
 * `` getByTestId(`bogus-stem-${P}`) `` was reported as `bogus-stem-*`; restored.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = path.join(repoRoot, 'e2e');

/** Test ids asked for by a spec that no component produces. Drains to []. */
const KNOWN_MISSING: readonly string[] = [];

/** Spec files that still parse a list id out of the index-bearing featured card test id. */
const KNOWN_INDEX_DERIVATIONS: readonly string[] = [];

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

/**
 * `data-testid={`stem-${x}`}` templates, as regexes over a concrete id.
 *
 * A substituted segment is `[A-Za-z0-9_]+` — right for a position, an index or
 * a bare uuid, and deliberately hyphen-FREE, because widening the class for
 * every substitution was measured here and rejected: it made `grid-item-image-1`,
 * `grid-item-title-1/2` and `grid-slot-empty-1` — all genuinely absent — match
 * unrelated multi-segment templates, which is the far worse direction for a
 * checker to be wrong in.
 *
 * One substitution is not that shape. A `testIdPrefix` is passed in kebab-case
 * by the caller (`<SectionHeader testIdPrefix="featured-lists" …>` renders
 * `${testIdPrefix}-section-title`), so instead of loosening the class this
 * enumerates the literals actually passed anywhere in src/ and substitutes an
 * alternation of exactly those. `featured-lists-section-title` therefore
 * resolves to its real producer while `bogus-not-real-section-title` still does
 * not — which a guessed `[A-Za-z0-9_-]+` could not distinguish.
 */
const SUBSTITUTION_RE = /\$\{([^}]+)\}/g;
const PREFIX_VALUES = [
  ...new Set(producers.flatMap((s) => Array.from(s.matchAll(/[Pp]refix[=:]\s*["']([^"']+)["']/g)).map((m) => m[1]))),
];
const prefixAlternation = PREFIX_VALUES.length
  ? `(?:${PREFIX_VALUES.map((v) => v.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`
  : '[A-Za-z0-9_]+';
/**
 * The template literal need not be the WHOLE expression. `SectionHeader` writes
 * `data-testid={testIdPrefix ? `${testIdPrefix}-section-title` : undefined}`,
 * and a matcher anchored on `data-testid={`` skipped it entirely — which is the
 * other half of why `featured-lists-section-title` read as unproduced.
 */
const TEMPLATE_ATTR_RE = /(?:data-testid|testId)=\{[^{}`]*`([^`]+)`/g;
const templateProducers = producers.flatMap((s) =>
  Array.from(s.matchAll(TEMPLATE_ATTR_RE)).map((m) => {
    const tpl = m[1];
    let re = '';
    let last = 0;
    for (const sub of tpl.matchAll(SUBSTITUTION_RE)) {
      re += tpl.slice(last, sub.index).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      re += /prefix/i.test(sub[1]) ? prefixAlternation : '[A-Za-z0-9_]+';
      last = sub.index + sub[0].length;
    }
    re += tpl.slice(last).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
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
    // `getByTestId(`drop-zone-wrapper-${position}`)` — a spec that composes the
    // id from a constant is asking for a STEM, and used to be invisible here.
    // drag-drop-ranking.spec.ts addresses the whole grid that way, so without
    // this the register could drain to [] while checking none of it.
    for (const m of text.matchAll(/getByTestId\(\s*`([^`]*?)\$\{/g)) {
      if (m[1]) add(prefixes, m[1], rel);
    }
    for (const m of text.matchAll(/data-testid(\^)?=\\?["']([^"'\\$]+)\\?["']/g)) {
      if (m[1]) add(prefixes, m[2], rel);
      else add(exact, m[2], rel);
    }
    // `[data-testid="featured-list-title-${listId}"]` inside a template literal
    for (const m of text.matchAll(/data-testid="([^"]*)\$\{[^}]+\}"/g)) add(prefixes, m[1], rel);
  }
  return { exact, prefixes };
}

// ---------------------------------------------------------------------------
// Tests that cannot fail on their own claim.
//
// A browser test whose every assertion sits inside `if (somethingWasVisible)`
// reports GREEN when the thing it is about never appeared — the empty-success
// lie, in the one place it is hardest to notice, because the run says "passed"
// and the count is arithmetically correct. `expect(true).toBeTruthy()` is the
// same defect written down explicitly. Six of this suite's 41 tests were in one
// of those two shapes on 2026-09-05.
//
// The check: strip comments, take each test's body, delete every `if (…) { … }`
// block from it, and require an `expect(` to survive. A test whose only
// assertions were conditional has none left.
// ---------------------------------------------------------------------------

/** Spec tests with no unconditional assertion. Drains to []. */
const KNOWN_UNFALSIFIABLE: readonly string[] = [];

/** Spec files containing a tautological assertion (`expect(true)`). Drains to []. */
const KNOWN_TAUTOLOGIES: readonly string[] = [];

const TAUTOLOGY_RE = /expect\(\s*(?:true|false)\s*\)/;

/** The `{ … }` block starting at `open`, brace-matched. Returns [start, end). */
function blockAt(text: string, open: number): [number, number] {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return [open, i + 1];
    }
  }
  return [open, text.length];
}

/** The body with every `if (…) { … }` block (and its `else`) removed. */
function withoutConditionalBlocks(body: string): string {
  let out = body;
  for (;;) {
    const m = /\bif\s*\(/.exec(out);
    if (!m) return out;
    const brace = out.indexOf('{', m.index);
    if (brace === -1) return out.slice(0, m.index) + out.slice(m.index + 2);
    const [, end] = blockAt(out, brace);
    let tail = end;
    const elseM = /^\s*else\s*/.exec(out.slice(end));
    if (elseM) {
      const elseBrace = out.indexOf('{', end);
      if (elseBrace !== -1 && elseBrace <= end + elseM[0].length) tail = blockAt(out, elseBrace)[1];
    }
    out = out.slice(0, m.index) + out.slice(tail);
  }
}

function unfalsifiableTests() {
  const offenders: string[] = [];
  for (const { rel, text } of specFiles) {
    const src = withoutComments(text);
    for (const m of src.matchAll(/\btest(?:\.only)?\(\s*(["'`])((?:(?!\1).)*)\1/g)) {
      const arrow = src.indexOf('=> {', m.index);
      if (arrow === -1) continue;
      const [start, end] = blockAt(src, src.indexOf('{', arrow));
      const body = src.slice(start, end);
      const unconditional = withoutConditionalBlocks(body).replace(
        new RegExp(TAUTOLOGY_RE.source, 'g'),
        '',
      );
      if (!/\bexpect\(/.test(unconditional)) offenders.push(`${rel}: ${m[2]}`);
    }
  }
  return offenders.sort();
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

  it('every test has an assertion that is not inside an if (register may only shrink)', () => {
    // Guard the guard: this must be looking at every test in the suite, or an
    // empty offender list means nothing.
    const testCount = specFiles.reduce(
      (n, { text }) => n + [...withoutComments(text).matchAll(/\btest(?:\.only)?\(\s*["'`]/g)].length,
      0,
    );
    expect(testCount).toBeGreaterThan(35);
    expect(unfalsifiableTests()).toEqual([...KNOWN_UNFALSIFIABLE].sort());
  });

  it('no spec asserts a tautology (expect(true)) — say what is expected, or record the gap', () => {
    const offenders = specFiles
      .filter(({ text }) => TAUTOLOGY_RE.test(withoutComments(text)))
      .map(({ rel }) => rel)
      .sort();
    expect(offenders).toEqual([...KNOWN_TAUTOLOGIES].sort());
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
