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
 *   typecheck:errors   lines matching /error TS\d+/ from `tsc --noEmit`.
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
 *   node scripts/ratchet.mjs --only eslint   skip the slow typecheck bucket
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
  const matches = out.match(/error TS\d+/g) ?? [];
  return { 'typecheck:errors': matches.length };
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
