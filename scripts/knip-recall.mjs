#!/usr/bin/env node
/**
 * Knip recall probe — does the scanner still SEE a dead export whose name is
 * shadowed by a local binding?
 *
 * Registry: codebase-scanning/precision-trades-have-a-direction,
 *           quality-gates/gate-liveness (the controls below).
 *
 * WHY THIS EXISTS
 *   knip v6 replaced its TypeScript backend with a parser that has no
 *   typechecker, so export/import matching became name-based. The tool's own
 *   maintainer notes (.agents/EXPORTS.md upstream) record the consequence:
 *   name-based matching produces FALSE NEGATIVES where a local binding shadows
 *   an exported name — a dead export silently counted as used. That is the one
 *   defect class no user can report, because nobody files a bug about a finding
 *   that was never made.
 *
 *   This repo adopted knip already at v6 (2026-08-24), so there is no pre-swap
 *   arm to diff against: the recall loss, whatever its size, is folded
 *   invisibly into the knip:* buckets in .ai/ratchet-baseline.json and cannot
 *   be recovered from inside this project. A differential is unavailable. A
 *   seeded corpus is what remains, and this is it.
 *
 * WHAT IT ASSERTS (the predicate travels with the number)
 *   A fixture project is generated in a temp dir with 13 exports:
 *     - 1 LIVE export, imported by the entry file       -> must NOT be reported
 *     - 1 dead export with a name used nowhere else     -> must be reported
 *     - 11 dead exports, each named identically to a local binding introduced
 *       by a different construct: block const, function parameter, arrow
 *       parameter, catch binding, for-of binding, for-in binding, object
 *       pattern, array pattern, rest pattern, defaulted destructuring, and a
 *       nested function declaration.
 *
 *   Those 11 are not invented. They are the scopes knip's own hand-written
 *   shadow detection registers, and two of them are flagged upstream as
 *   ordering-sensitive: parameters and loop bindings bind BEFORE the body whose
 *   range a naive implementation would key on. The enumeration IS the test
 *   matrix.
 *
 *   Measured 2026-08-31 against knip 6.32.2: 12 of 12 dead exports reported,
 *   0 false negatives. The documented class is real as history and closed in
 *   this version. This probe exists so that an upgrade cannot silently reopen
 *   it — the answer is not expected to change, and the whole value is that it
 *   is re-run rather than remembered.
 *
 * THE FIXTURE LIVES IN A TEMP DIR, NOT IN src/. A checked-in fixture of
 * deliberately-dead exports would be walked by this repo's own knip run and
 * would inflate the very knip:unusedExports baseline this probe protects.
 *
 * EXIT CODES (a could-not-run is spelled differently from a fail):
 *   0  every dead export was reported — no recall loss in this class
 *   1  at least one dead export went unreported — a real recall regression,
 *      and a verdict about the scanner, not about this repo's code
 *   2  the probe could not run, or its own controls failed (the live export was
 *      reported, or the unique-named dead export was not). NOT a pass, and NOT
 *      a recall verdict.
 *
 * USAGE
 *   node scripts/knip-recall.mjs            (npm run scan:recall)
 *   node scripts/knip-recall.mjs --keep     leave the fixture on disk to inspect
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KNIP_CLI = path.join(repoRoot, 'node_modules', 'knip', 'dist', 'cli.js');

const KEEP = process.argv.slice(2).includes('--keep');

const EXIT_OK = 0;
const EXIT_RECALL_LOSS = 1;
const EXIT_CANNOT_RUN = 2;

/** name -> the construct that shadows it in the entry file. */
const SHADOWED = {
  deadBlock: 'block-scoped const',
  deadParam: 'function parameter',
  deadArrowParam: 'arrow parameter',
  deadCatch: 'catch binding',
  deadForOf: 'for-of binding',
  deadForIn: 'for-in binding',
  deadObjPat: 'object pattern',
  deadArrPat: 'array pattern',
  deadRest: 'rest pattern',
  deadDefault: 'defaulted destructuring',
  deadNestedFn: 'nested function declaration',
};

const LIVE = 'liveExport';
const DEAD_CONTROL = 'deadUnique';
const EXPECTED_DEAD = [DEAD_CONTROL, ...Object.keys(SHADOWED)];

const MOD_TS = [
  `export const ${LIVE} = 1;`,
  `export const ${DEAD_CONTROL} = 2;`,
  ...Object.keys(SHADOWED).map((n, i) => `export const ${n} = ${i + 3};`),
  '',
].join('\n');

// Every name in SHADOWED is bound locally here, by the construct it is named
// for, and every binding is USED so that no other rule can explain its absence.
const INDEX_TS = `import { ${LIVE} } from './mod';

export function main(deadParam: number) {
  const deadBlock = ${LIVE};
  try { /* nothing */ } catch (deadCatch) { void deadCatch; }
  for (const deadForOf of [1]) { void deadForOf; }
  for (const deadForIn in { a: 1 }) { void deadForIn; }
  const { deadObjPat } = { deadObjPat: 1 };
  const [deadArrPat] = [1];
  const { a: _a, ...deadRest } = { a: 1, b: 2 };
  const { deadDefault = 1 } = {} as { deadDefault?: number };
  const arrow = (deadArrowParam: number) => deadArrowParam;
  function deadNestedFn() { return 1; }
  return [deadBlock, deadParam, deadObjPat, deadArrPat, deadRest, deadDefault, arrow(1), deadNestedFn()];
}
`;

function die(code, message, detail) {
  console.error(`knip-recall: ${message}`);
  if (detail) console.error(String(detail).split('\n').slice(0, 12).join('\n'));
  process.exit(code);
}

if (!existsSync(KNIP_CLI)) {
  die(EXIT_CANNOT_RUN, `knip not installed at ${path.relative(repoRoot, KNIP_CLI)} — run npm install`);
}

const dir = mkdtempSync(path.join(tmpdir(), 'knip-recall-'));
let raw;
try {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), '{ "name": "knip-recall-fixture", "version": "0.0.0", "private": true }\n');
  writeFileSync(path.join(dir, 'knip.json'), '{ "entry": ["index.ts"], "project": ["*.ts"] }\n');
  writeFileSync(path.join(dir, 'mod.ts'), MOD_TS);
  writeFileSync(path.join(dir, 'index.ts'), INDEX_TS);

  // knip exits non-zero when it finds issues, which is the expected case here.
  try {
    raw = execFileSync(process.execPath, [KNIP_CLI, '--reporter', 'json', '--no-progress'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (typeof err.stdout !== 'string' || err.stdout.trim() === '') {
      die(EXIT_CANNOT_RUN, 'knip produced no output', err.stderr || err.message);
    }
    raw = err.stdout;
  }
} finally {
  if (KEEP) console.error(`knip-recall: fixture kept at ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
}

let reported;
try {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.issues)) throw new Error('no `issues` array in reporter output');
  reported = new Set();
  for (const rec of parsed.issues) {
    for (const e of rec.exports ?? []) if (e && e.name) reported.add(e.name);
    for (const t of rec.types ?? []) if (t && t.name) reported.add(t.name);
  }
} catch (err) {
  // A shape change in the reporter is a could-not-run, never a clean pass:
  // an empty set would otherwise read as "everything was found".
  die(EXIT_CANNOT_RUN, 'could not parse knip JSON output (reporter shape changed?)', err.message);
}

// Controls first — gate-liveness. Either failure means the probe is measuring
// something other than what it claims, and neither is a recall verdict.
if (reported.has(LIVE)) {
  die(EXIT_CANNOT_RUN, `control failed: the imported export \`${LIVE}\` was reported unused — the fixture or the scanner is wrong, not this repo`);
}
if (!reported.has(DEAD_CONTROL)) {
  die(EXIT_CANNOT_RUN, `control failed: the unique-named dead export \`${DEAD_CONTROL}\` was NOT reported — knip did not analyse the fixture`);
}

const missed = EXPECTED_DEAD.filter(n => !reported.has(n));

if (missed.length > 0) {
  console.error(`knip-recall: RECALL LOSS — ${missed.length} of ${EXPECTED_DEAD.length} dead exports went unreported.`);
  for (const n of missed) console.error(`  ${n.padEnd(16)} shadowed by ${SHADOWED[n] ?? 'nothing (unique name)'}`);
  console.error('');
  console.error('  These exports are dead and knip did not say so. Every unreported construct is a');
  console.error('  class of dead code this repo can no longer detect, and it will not announce itself:');
  console.error('  the knip:* buckets in .ai/ratchet-baseline.json are now a floor, not a count.');
  process.exit(EXIT_RECALL_LOSS);
}

console.log(`knip-recall: ${EXPECTED_DEAD.length}/${EXPECTED_DEAD.length} dead exports reported — no recall loss in the shadowing class.`);
console.log(`  controls: \`${LIVE}\` correctly absent, \`${DEAD_CONTROL}\` correctly present.`);
console.log(`  constructs covered: ${Object.keys(SHADOWED).length} (${Object.values(SHADOWED).join(', ')}).`);
process.exit(EXIT_OK);
