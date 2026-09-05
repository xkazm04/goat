#!/usr/bin/env node
/**
 * Quality ratchet — holds the metrics that cannot be zeroed today.
 *
 * Registry: quality-gates/ratchet-design, quality-gates/gate-liveness.
 *
 * WHAT IT COUNTS (the predicate travels with every number):
 *   eslint:<rule>      findings of that rule reported by `eslint src` over this
 *                      repo's eslint.config.mjs, counting BOTH severities. Only
 *                      rules with a non-zero legacy population get a bucket;
 *                      rules at zero live at `error` severity in the config and
 *                      need no bucket (see "graduation" below).
 *   typecheck:errors   errors from `tsc --noEmit` in files OUTSIDE .next/.
 *                      The exclusion is the predicate, and it is load-bearing:
 *                      tsconfig deliberately includes .next/types/**, so a tree
 *                      where `next dev` has run type-checks 6 extra generated
 *                      files that a fresh checkout does not have. Counting them
 *                      makes the number depend on whether someone has started
 *                      the dev server, which is not a property of the code.
 *                      Found by this ratchet's first CI run: 29 locally, 23 on
 *                      the runner, same commit.
 *   knip:unusedFiles   modules knip finds unreachable from any declared entry
 *                      point (knip.json), i.e. the orphan class eslint's
 *                      unused-imports rule structurally cannot see: unused
 *                      EXPORTS, not unused imports.
 *   knip:unusedExports named exports nothing imports.
 *   knip:unusedTypes   exported types nothing imports.
 *   docs:unmappedAreas top-level source areas (as enumerated by
 *                      .ai/doc-coupling.json coverage.areaRoots) that no
 *                      coupling entry claims and that carry no reasoned
 *                      exemption. Measured by scripts/doc-coupling.mjs --json.
 *                      A REPORT with a baseline, not a bar to clear: 69 of 80
 *                      areas are unmapped and nobody is writing 69 documents
 *                      this month. What the bucket buys is that the 70th area
 *                      cannot arrive undocumented and unnoticed.
 *
 * SYMMETRIC COMPARISON. A rise is a regression. A DROP IS ALSO A FAILURE, and
 * that is deliberate: a drop has at least three causes — the defect was fixed,
 * the file carrying it was deleted, or the counter broke — and they are
 * indistinguishable from the number alone. Failing on the drop forces a human
 * to write `--update` and say in the commit message which of the three it was.
 *
 * EXIT CODES (a could-not-run is spelled differently from a fail):
 *   0  every bucket matches its baseline
 *   1  at least one bucket diverged — a real verdict about the code
 *   2  the instrument could not run or walked an implausible population; this
 *      is NOT a pass and NOT a code verdict. Never treat it as either.
 *
 * USAGE
 *   node scripts/ratchet.mjs            check (npm run lint:ratchet)
 *   node scripts/ratchet.mjs --update   rewrite the baseline (human intent only;
 *                                       never wire this into a pipeline)
 *   node scripts/ratchet.mjs --only eslint   one metric only (eslint|typecheck|knip|docs)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(repoRoot, '.ai', 'ratchet-baseline.json');

const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

const EXIT_OK = 0;
const EXIT_DIVERGED = 1;
const EXIT_CANNOT_RUN = 2;

/** A could-not-run. Distinct from a verdict, and says so loudly. */
function cannotRun(what, detail) {
  console.error(`\n[ratchet] COULD NOT RUN — ${what}`);
  console.error(`[ratchet] ${detail}`);
  console.error('[ratchet] This is not a pass and not a failure. Nothing was measured.');
  process.exit(EXIT_CANNOT_RUN);
}

// Resolve the local binaries and run them under THIS node, rather than through
// npx/.cmd shims — spawning a .cmd without a shell is EINVAL on Windows, and
// spawning one *with* a shell reintroduces quoting bugs.
const ESLINT_BIN = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
const TSC_BIN = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const KNIP_BIN = path.join(repoRoot, 'node_modules', 'knip', 'bin', 'knip.js');

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

function countEslint() {
  let raw;
  try {
    raw = execFileSync(process.execPath, [ESLINT_BIN, 'src', '-f', 'json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      // eslint exits 1 when it reports errors; that is data here, not a crash.
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // Only a genuine invocation failure leaves us without stdout.
    if (!err.stdout) cannotRun('eslint produced no output', String(err.message).slice(0, 400));
    raw = err.stdout;
  }

  let results;
  try {
    results = JSON.parse(raw);
  } catch {
    cannotRun('eslint output was not JSON', raw.slice(0, 400));
  }

  // Instrument assertion: a walk over an empty or near-empty population is a
  // broken glob, not a clean codebase. `next lint` in this repo once exited
  // having linted zero files, and nobody noticed for months.
  //
  // The floor guards CHECK mode only. In --update mode it is deliberately a
  // warning: the floor is derived FROM the baseline, so enforcing it during a
  // re-baseline would make a bad floor unrecoverable by the very command whose
  // job is to fix it. (Learned the hard way while proving this gate red.)
  const filesWalked = results.length;
  if (filesWalked < MIN_FILES_WALKED) {
    if (UPDATE) {
      console.warn(
        `[ratchet] note: population is ${filesWalked} files, under the recorded floor of ` +
          `${MIN_FILES_WALKED}. Re-baselining anyway — confirm the walk is right before committing.`,
      );
    } else {
      cannotRun(
        `eslint walked ${filesWalked} files, below the floor of ${MIN_FILES_WALKED}`,
        'The source glob is probably broken. Fix the walk before trusting any count.',
      );
    }
  }

  const counts = {};
  for (const file of results) {
    for (const msg of file.messages) {
      const rule = msg.ruleId ?? '(unused-disable-directive)';
      counts[`eslint:${rule}`] = (counts[`eslint:${rule}`] ?? 0) + 1;
    }
  }
  return { counts, filesWalked };
}

function countTypecheck() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [TSC_BIN, '--noEmit'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    if (!out) cannotRun('tsc produced no output', String(err.message).slice(0, 400));
  }
  // Count per LINE so each error can be attributed to its file, then drop the
  // generated ones. `out.match(/error TS\d+/g)` counted every occurrence with no
  // idea where it came from — a count with no predicate.
  const errorLines = out
    .split(/\r?\n/)
    .filter((line) => /error TS\d+/.test(line));
  const counted = errorLines.filter((line) => !isGeneratedOutput(line));
  const excluded = errorLines.length - counted.length;
  if (excluded > 0) {
    console.log(
      `[ratchet] typecheck: ${counted.length} errors counted, ` +
        `${excluded} excluded as generated .next/ output.`,
    );
  }
  return { 'typecheck:errors': counted.length };
}

/** tsc prints `path/to/file.ts(12,34): error TS1234: ...` — read the path. */
function isGeneratedOutput(line) {
  const filePath = line.split('(')[0].trim().replace(/\\/g, '/');
  return filePath.startsWith('.next/') || filePath.includes('/.next/');
}

/**
 * Unused EXPORTS — the orphan class eslint-plugin-unused-imports structurally
 * cannot see. It reports unused imports and locals; it has no opinion about an
 * export nobody imports, which is exactly how src/lib/virtual/ (2,118 lines)
 * and src/lib/orchestration/ (2,494 lines) sat orphaned. Every orphan in the
 * 2026-08-24 audit was found by hand-grepping importers.
 *
 * This is a REPORT with a baseline, not a bar to clear: 241 unused files is
 * not a number anyone will drive to zero soon. What the bucket buys is that
 * the 242nd is refused.
 */
function countKnip() {
  let raw;
  try {
    raw = execFileSync(process.execPath, [KNIP_BIN, '--reporter', 'json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // knip exits non-zero when it has findings; that is data, not a crash.
    if (!err.stdout) cannotRun('knip produced no output', String(err.message).slice(0, 400));
    raw = err.stdout;
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    cannotRun('knip output was not JSON', raw.slice(0, 400));
  }

  const issues = report.issues ?? [];
  if (issues.length === 0) {
    // knip finding literally nothing in a repo this size means the entry-point
    // config stopped matching, not that the repo went clean overnight.
    cannotRun(
      'knip reported zero issue entries',
      'knip.json entry globs have probably stopped matching. Fix the config before trusting this.',
    );
  }

  let files = 0;
  let exports = 0;
  let types = 0;
  for (const issue of issues) {
    files += issue.files?.length ?? 0;
    exports += issue.exports?.length ?? 0;
    types += issue.types?.length ?? 0;
  }
  return {
    'knip:unusedFiles': files,
    'knip:unusedExports': exports,
    'knip:unusedTypes': types,
  };
}

/**
 * Unmapped source areas — the docs-sync coverage residue.
 *
 * The coupling map's own checker validates that every path the map NAMES
 * resolves. That is structurally incapable of seeing what the map OMITS, so
 * the checker also enumerates the coupling universe and reports the areas
 * nothing claims. That residue is the number held here.
 *
 * The distinction that matters for this ratchet: doc-coupling exits 1 for a
 * BROKEN ENTRY (a stale glob, a missing reference doc) — a verdict the author
 * must fix — and exits 2 when it could not measure. Neither is a count, so
 * both are passed straight through rather than being folded into a bucket.
 */
function countDocCoupling() {
  const SCRIPT = path.join(repoRoot, 'scripts', 'doc-coupling.mjs');
  let raw;
  try {
    raw = execFileSync(process.execPath, [SCRIPT, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (err.status === 2 || !err.stdout) {
      cannotRun(
        'doc-coupling could not measure the coupling universe',
        `${String(err.stderr ?? err.message).slice(0, 400)}`,
      );
    }
    // exit 1 with JSON on stdout: it measured, and it also found broken
    // entries. Report them here rather than losing them to the ratchet's
    // bucket comparison, which has nothing to say about a stale glob.
    raw = err.stdout;
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    cannotRun('doc-coupling output was not JSON', raw.slice(0, 400));
  }

  if (report.problems?.length) {
    console.error('[ratchet] doc-coupling reported broken entries:');
    for (const p of report.problems) console.error(`[ratchet]   ${p}`);
    console.error('[ratchet] Fix the map (npm run docs:coupling) before trusting its count.');
    process.exit(EXIT_DIVERGED);
  }

  console.log(
    `[ratchet] docs: ${report.mapped} of ${report.areasWalked} areas mapped, ` +
      `${report.allowlisted} exempt, ${report.unmappedAreas} unmapped.`,
  );
  return { 'docs:unmappedAreas': report.unmappedAreas };
}

// ---------------------------------------------------------------------------
// Baseline I/O
// ---------------------------------------------------------------------------

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch (err) {
  if (!UPDATE) {
    cannotRun(`could not read ${path.relative(repoRoot, BASELINE_PATH)}`, String(err.message));
  }
  baseline = { buckets: {} };
}

const MIN_FILES_WALKED = baseline.instrument?.minFilesWalked ?? 200;

// ---------------------------------------------------------------------------
// Measure
// ---------------------------------------------------------------------------

const measured = {};
let filesWalked = null;

if (!ONLY || ONLY === 'eslint') {
  const r = countEslint();
  Object.assign(measured, r.counts);
  filesWalked = r.filesWalked;
}
if (!ONLY || ONLY === 'typecheck') {
  Object.assign(measured, countTypecheck());
}
if (!ONLY || ONLY === 'knip') {
  Object.assign(measured, countKnip());
}
if (!ONLY || ONLY === 'docs') {
  Object.assign(measured, countDocCoupling());
}

// ---------------------------------------------------------------------------
// Update mode
// ---------------------------------------------------------------------------

if (UPDATE) {
  if (ONLY) {
    console.error('[ratchet] --update refuses to run with --only: a partial');
    console.error('[ratchet] re-baseline would silently delete the skipped buckets.');
    process.exit(EXIT_CANNOT_RUN);
  }
  const next = {
    $schema: 'ai-ratchet-baseline/0.1.0',
    $comment:
      'Baseline for npm run lint:ratchet. NEVER auto-updated by a pipeline — a ' +
      'baseline that rewrites itself is a recorder, not a gate. Every change to ' +
      'this file must state, in its commit message, WHY a number moved: fixed, ' +
      'deleted, or the counter broke.',
    recomputeWith: 'node scripts/ratchet.mjs --update',
    checkWith: 'npm run lint:ratchet',
    predicate: {
      'eslint:*': 'findings of that rule from `eslint src` under eslint.config.mjs, both severities',
      'typecheck:errors': 'lines matching /error TS[0-9]+/ from `tsc --noEmit`',
      'knip:*': 'unused files / named exports / exported types from `knip --reporter json` under knip.json',
      'docs:unmappedAreas':
        'top-level source areas from .ai/doc-coupling.json coverage.areaRoots that no ' +
        'coupling entry claims and that carry no reasoned exemption',
    },
    measuredAt: new Date().toISOString().slice(0, 10),
    instrument: {
      filesWalked,
      minFilesWalked: Math.floor((filesWalked ?? 200) * 0.8),
    },
    buckets: Object.fromEntries(Object.entries(measured).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  const total = Object.values(next.buckets).reduce((a, b) => a + b, 0);
  console.log(
    `[ratchet] baseline written: ${Object.keys(next.buckets).length} buckets, ` +
      `${total} findings, ${filesWalked} files walked.`,
  );
  console.log('[ratchet] Say in the commit message why each number moved.');
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------
// Check mode — symmetric
// ---------------------------------------------------------------------------

const buckets = baseline.buckets ?? {};
const relevant = (key) => !ONLY || key.startsWith(`${ONLY}:`);
const keys = [...new Set([...Object.keys(buckets), ...Object.keys(measured)])]
  .filter(relevant)
  .sort();

const rises = [];
const drops = [];
for (const key of keys) {
  const was = buckets[key] ?? 0;
  const now = measured[key] ?? 0;
  if (now > was) rises.push({ key, was, now });
  else if (now < was) drops.push({ key, was, now });
}

const checked = keys.length;
const total = keys.reduce((a, k) => a + (measured[k] ?? 0), 0);
console.log(
  `[ratchet] ${checked} buckets checked, ${total} findings` +
    (filesWalked === null ? '' : `, ${filesWalked} source files walked`) +
    ` (baseline ${baseline.measuredAt ?? 'undated'}).`,
);

if (rises.length === 0 && drops.length === 0) {
  console.log('[ratchet] every bucket matches its baseline.');
  process.exit(EXIT_OK);
}

for (const { key, was, now } of rises) {
  console.error(`[ratchet] RISE  ${key}: ${was} -> ${now}  (+${now - was})`);
}
for (const { key, was, now } of drops) {
  console.error(`[ratchet] DROP  ${key}: ${was} -> ${now}  (${now - was})`);
}

console.error('');
if (rises.length) {
  console.error('A RISE means new findings landed. Fix them, or — if the rise is');
  console.error('deliberate and accepted — re-baseline UPWARD in its own reviewed');
  console.error('commit that states the trade.');
}
if (drops.length) {
  console.error('A DROP is not automatically good news. It means one of three things,');
  console.error('and only a human can tell which:');
  console.error('  (a) the finding was genuinely fixed        -> re-baseline, say so');
  console.error('  (b) the code carrying it was deleted       -> re-baseline, say so');
  console.error('  (c) the counter stopped seeing its target  -> STOP. Fix the counter.');
  console.error('Run `node scripts/ratchet.mjs --update` in the same commit as the fix.');
}
console.error('');
console.error('A bucket that reaches 0 should GRADUATE: promote its rule to "error" in');
console.error('eslint.config.mjs and delete the bucket. A zero-baseline ratchet and a');
console.error('plain ban behave identically, and the ban is simpler.');
process.exit(EXIT_DIVERGED);
