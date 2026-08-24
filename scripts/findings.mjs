#!/usr/bin/env node
/**
 * The findings ledger — identity, verification, and named exits for the
 * 190 findings that had none.
 *
 * Registry: codebase-scanning/finding-lifecycle, dead-code/quarantine-vs-delete.
 *
 * WHY THIS EXISTS
 * ---------------
 * `docs/harness/ui-bug-combined-2026-06-16/` is 63 markdown files holding 190
 * findings from a one-shot scan, plus 19 "FIXES-WAVE-*" documents claiming
 * closures against them. Between the two there was:
 *
 *   - no dedup key, so no finding could be joined to its own closure, or to
 *     itself on a later sweep;
 *   - no notion of "fixed", so nothing distinguished a defect that was
 *     repaired from one nobody had looked at since June;
 *   - no verification, so a closure claim was believed because it was written
 *     down;
 *   - no expiry, so the snapshot aged in place while the tree moved under it.
 *
 * A scanner without a lifecycle produces the same finding fifty times, forgets
 * what was already judged, and cannot tell progress from churn. This script is
 * that lifecycle, applied retroactively to a corpus that was written without
 * one.
 *
 * THE LEDGER IS DERIVED, NOT AUTHORED
 * -----------------------------------
 * The markdown reports are the authority for what was found; `.ai/findings.json`
 * is a derived view, recomputed by `--ingest` and compared by `--check`. Only
 * the VERDICT fields (state, reason, owner, revisit, probe) are hand-written,
 * and `--ingest` preserves them across a re-derivation, keyed by the dedup key.
 * That is the whole reason the key has to be stable.
 *
 * IDENTITY
 * --------
 *   key = sha256(contextSlug | anchorFile | titleSlug)[0..12]
 * The anchor FILE, never the anchor line: the naive rule+file+line key breaks
 * the day anyone edits above the match site — the line shifts, the key changes,
 * yesterday's judged finding refiles as new, and its predecessor dangles as a
 * phantom. Line numbers ride along as presentation detail.
 *
 * STATES (every finding leaves through a named door)
 *   open            found, not yet judged
 *   fixed           remediated AND verified; carries `fixedIn` and, where one
 *                   can be written, a `probe` that would catch a regression
 *   rejected        judged a false positive; REQUIRES a reason
 *   suppressed      a true match deliberately accepted; REQUIRES a reason, and
 *                   takes an owner and a revisit horizon
 *   expired         not re-found by a sweep that actually re-examined its
 *                   location; REQUIRES a reason
 *   needs-reanchor  the anchor file no longer exists. NOT "fixed" — absence
 *                   also happens when the sensor never ran, and counting that
 *                   as a win is the loop fabricating its own successes.
 *
 * EXIT CODES
 *   0  green
 *   1  a verdict — the ledger diverges from the reports, a state is
 *      unjustified, or a regression probe fired
 *   2  COULD NOT RUN. Not a pass and not a failure. Nothing was measured.
 *
 * USAGE
 *   node scripts/findings.mjs --ingest     re-derive the ledger from the reports
 *   node scripts/findings.mjs --check      CI gate: derivation + invariants + probes
 *   node scripts/findings.mjs --verify     verification pass over the current tree
 *   node scripts/findings.mjs --report     what the ledger can answer
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_DIR = path.join(repoRoot, 'docs', 'harness', 'ui-bug-combined-2026-06-16');
const LEDGER_PATH = path.join(repoRoot, '.ai', 'findings.json');

const argv = process.argv.slice(2);
const INGEST = argv.includes('--ingest');
const CHECK = argv.includes('--check');
const VERIFY = argv.includes('--verify');
const REPORT = argv.includes('--report');

const EXIT_OK = 0;
const EXIT_VERDICT = 1;
const EXIT_CANNOT_RUN = 2;

/** The scan that produced this corpus. Its own INDEX.md asserts both numbers. */
const EXPECTED_FINDINGS = 190;
const EXPECTED_CONTEXTS = 38;

const STATES = new Set(['open', 'fixed', 'rejected', 'suppressed', 'expired', 'needs-reanchor']);
/** States whose whole point is that a human said why. */
const STATES_REQUIRING_REASON = new Set(['rejected', 'suppressed', 'expired']);

function cannotRun(what, detail) {
  console.error(`\n[findings] COULD NOT RUN — ${what}`);
  if (detail) console.error(`[findings] ${detail}`);
  console.error('[findings] This is not a pass and not a failure. Nothing was measured.');
  process.exit(EXIT_CANNOT_RUN);
}

// ---------------------------------------------------------------------------
// Derivation: the reports -> findings
// ---------------------------------------------------------------------------

function contextReports() {
  if (!existsSync(REPORT_DIR)) {
    cannotRun(
      `the report directory is missing: ${path.relative(repoRoot, REPORT_DIR)}`,
      'The ledger is DERIVED from those reports. Without them nothing can be recomputed, ' +
        'and a ledger nobody can recompute is a snapshot again.',
    );
  }
  return readdirSync(REPORT_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md' && !f.startsWith('FIXES-'))
    .sort();
}

const FIELD = (block, name) => {
  const m = block.match(new RegExp(`^- \\*\\*${name}\\*\\*:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

/**
 * The anchor is the FIRST `path:line` token in the File field. Several findings
 * name a second, third or fourth site in parentheses; those are kept verbatim as
 * `anchorRaw` (a finding's blast radius is part of its evidence) but only the
 * first participates in identity, so adding a cross-reference later does not
 * refile the finding as new.
 */
function parseAnchor(raw) {
  if (!raw) return { file: null, lines: null, raw: null };
  // Longest extension first. `ts|tsx` would match `.ts` inside `.tsx` and
  // silently truncate every React component path in the corpus to a file that
  // does not exist — which the verification pass then reports as a vanished
  // anchor. Caught by the first --verify run: 100 of 190 anchors "gone".
  const m = raw.match(
    /([\w./[\]()@-]+\.(?:tsx|ts|jsx|mjs|js|css|json|md|sql|yaml|yml))(?::([\d,\s-]+))?/,
  );
  if (!m) return { file: null, lines: null, raw };
  return { file: m[1], lines: m[2] ? m[2].trim() : null, raw };
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

function dedupKey(contextSlug, anchorFile, title) {
  return createHash('sha256')
    .update(`${contextSlug}|${anchorFile ?? '(no-anchor)'}|${slugify(title)}`)
    .digest('hex')
    .slice(0, 12);
}

function deriveFindings() {
  const out = [];
  for (const file of contextReports()) {
    const contextSlug = file.replace(/\.md$/, '');
    const text = readFileSync(path.join(REPORT_DIR, file), 'utf8');
    // Split on the numbered finding headings. The leading chunk is the report
    // preamble and is deliberately dropped.
    const chunks = text.split(/^## (\d+)\.\s+/m);
    for (let i = 1; i < chunks.length; i += 2) {
      const ordinal = Number(chunks[i]);
      const body = chunks[i + 1] ?? '';
      const title = body.split(/\r?\n/)[0].trim();
      const anchor = parseAnchor(FIELD(body, 'File'));
      out.push({
        key: dedupKey(contextSlug, anchor.file, title),
        context: contextSlug,
        ordinal,
        title,
        severity: (FIELD(body, 'Severity') ?? 'unknown').toLowerCase(),
        lens: FIELD(body, 'Lens') ?? 'unknown',
        category: FIELD(body, 'Category') ?? 'unknown',
        anchorFile: anchor.file,
        anchorLines: anchor.lines,
        anchorRaw: anchor.raw,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Closure references: the join that was never possible
// ---------------------------------------------------------------------------

/**
 * The 19 FIXES-WAVE documents name what they closed as `<slug> #<n>` — but the
 * slugs are ABBREVIATED and inconsistent (`achievements` for
 * `achievements-awards`, `auth` for `authentication-user-accounts`), and the
 * same pattern also matches ordinary prose ("finding #5", "sweep #2").
 *
 * This resolver accepts a reference ONLY when the prefix identifies exactly one
 * context. Anything ambiguous or unmatched is counted and listed rather than
 * guessed: a fuzzy join would attach a closure to the wrong finding and the
 * ledger would then be confidently wrong, which is worse than the snapshot it
 * replaced. The unresolved count IS the finding about the closure records.
 */
function closureReferences(contexts) {
  const refs = [];
  const files = readdirSync(REPORT_DIR).filter((f) => f.startsWith('FIXES-') && f.endsWith('.md'));
  for (const f of files) {
    const text = readFileSync(path.join(REPORT_DIR, f), 'utf8');
    for (const m of text.matchAll(/([a-z][a-z0-9-]{2,})\s+#(\d+)/g)) {
      const [, slug, n] = m;
      const matches = contexts.filter((c) => c === slug || c.startsWith(`${slug}-`));
      refs.push({
        source: f,
        raw: `${slug} #${n}`,
        ordinal: Number(n),
        resolved: matches.length === 1 ? matches[0] : null,
        candidates: matches.length,
      });
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Ledger I/O
// ---------------------------------------------------------------------------

function readLedger() {
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  } catch (err) {
    if (INGEST) return null;
    cannotRun(
      `could not read ${path.relative(repoRoot, LEDGER_PATH)}`,
      `${String(err.message)}\nRun: node scripts/findings.mjs --ingest`,
    );
  }
}

/** Only the verdict travels across a re-derivation. Everything else is derived. */
const VERDICT_FIELDS = ['state', 'reason', 'fixedIn', 'verifiedAt', 'owner', 'revisit', 'probe'];

function runIngest() {
  const derived = deriveFindings();
  const prior = readLedger();
  const priorByKey = new Map((prior?.findings ?? []).map((f) => [f.key, f]));

  let carried = 0;
  let orphaned = 0;
  const merged = derived.map((d) => {
    const was = priorByKey.get(d.key);
    const entry = { ...d, state: 'open', firstSeen: prior?.scan?.date ?? '2026-06-16' };
    if (was) {
      priorByKey.delete(d.key);
      for (const f of VERDICT_FIELDS) if (was[f] !== undefined) entry[f] = was[f];
      if (was.firstSeen) entry.firstSeen = was.firstSeen;
      if (was.state && was.state !== 'open') carried += 1;
    }
    return entry;
  });
  // A judged finding whose key vanished means the report text moved under it.
  // Loud, because silently dropping a verdict is how a ledger starts lying.
  for (const [, left] of priorByKey) {
    if (left.state && left.state !== 'open') {
      orphaned += 1;
      console.error(
        `[findings] WARNING: judged finding ${left.key} (${left.context} #${left.ordinal}, ` +
          `state=${left.state}) no longer derives from the reports. Its verdict is being DROPPED. ` +
          `If the report text was edited, re-attach the verdict by hand.`,
      );
    }
  }

  const contexts = [...new Set(derived.map((d) => d.context))];
  const refs = closureReferences(contexts);

  const ledger = {
    $schema: 'ai-findings-ledger/0.1.0',
    $comment:
      'DERIVED from docs/harness/ui-bug-combined-2026-06-16/. Recompute with ' +
      '`node scripts/findings.mjs --ingest`; `--check` re-derives and fails on any ' +
      'divergence. Only the verdict fields (state, reason, fixedIn, verifiedAt, owner, ' +
      'revisit, probe) are hand-written, and they survive a re-derivation because the ' +
      'dedup key is stable under edits above the match site.',
    derivedFrom: 'docs/harness/ui-bug-combined-2026-06-16/',
    recomputeWith: 'node scripts/findings.mjs --ingest',
    checkWith: 'npm run findings:check',
    identity:
      'sha256(contextSlug | anchorFile | titleSlug)[0..12]. The anchor FILE, never the ' +
      'anchor line: a rule+file+LINE key changes the day anyone edits above the match ' +
      'site, refiling a judged finding as new while its predecessor dangles as a phantom.',
    states: {
      open: 'found, not yet judged',
      fixed: 'remediated AND verified; carries fixedIn, and a probe where one can be written',
      rejected: 'judged a false positive; requires a reason (and the rate per lens is itself a finding about the scanner)',
      suppressed: 'a true match deliberately accepted; requires a reason, takes an owner and a revisit horizon',
      expired: 'not re-found by a sweep that actually re-examined its location; requires a reason',
      'needs-reanchor':
        'the anchor file no longer exists. NOT fixed — absence also happens when the sensor never ran',
    },
    scan: {
      name: 'combined ui-perfectionist + bug-hunter scan',
      date: '2026-06-16',
      contexts: contexts.length,
      findings: merged.length,
      note:
        'One-shot scan, 5 findings per context by construction — a per-context CAP, not a ' +
        'measurement of how many defects each context holds. The cap is disclosed here ' +
        'because a cap over an unstable order silently rotates which findings anyone ever ' +
        'sees. Nothing has re-swept since; every open finding below is 2026-06-16 evidence.',
    },
    closureRecords: {
      note:
        'The 19 FIXES-WAVE-*.md documents name closures as `<slug> #<n>` with abbreviated, ' +
        'inconsistent slugs, so most cannot be joined to a finding. Resolved only where the ' +
        'prefix identifies exactly one context; the rest are counted, never guessed. This ' +
        'number is the measurement of the defect this ledger exists to fix.',
      references: refs.length,
      resolved: refs.filter((r) => r.resolved).length,
      unresolvable: refs.filter((r) => !r.resolved).length,
    },
    findings: merged.sort((a, b) => a.context.localeCompare(b.context) || a.ordinal - b.ordinal),
  };

  writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(
    `[findings] ledger written: ${merged.length} findings over ${contexts.length} contexts; ` +
      `${carried} hand-written verdicts carried across the re-derivation` +
      (orphaned ? `, ${orphaned} DROPPED (see warnings above)` : '') +
      `.`,
  );
  console.log(
    `[findings] closure references in FIXES-WAVE-*.md: ${ledger.closureRecords.references} seen, ` +
      `${ledger.closureRecords.resolved} resolvable to exactly one context, ` +
      `${ledger.closureRecords.unresolvable} not resolvable.`,
  );
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------
// Verification pass
// ---------------------------------------------------------------------------

/**
 * A probe is what makes "fixed" checkable rather than asserted. `absent` is a
 * regex that MUST NOT match the named file any more; if it does, the fix did
 * not hold and the finding REGRESSED — a louder state than a new finding,
 * because it impeaches the fix. `present` is the mirror for a fix that ADDED
 * something.
 */
function runProbe(probe) {
  const abs = path.join(repoRoot, probe.file);
  if (!existsSync(abs)) {
    return { ok: false, why: `probe file missing: ${probe.file}` };
  }
  const text = readFileSync(abs, 'utf8');
  // A probe that will not compile is a broken instrument, not a verdict about
  // the code — and it must not take the process down with an uncaught throw,
  // which is what it did the first time one was mistyped.
  const compile = (src) => {
    try {
      return new RegExp(src);
    } catch (err) {
      return { bad: String(err.message) };
    }
  };
  for (const [kind, src] of [
    ['absent', probe.absent],
    ['present', probe.present],
  ]) {
    if (!src) continue;
    const re = compile(src);
    if (re.bad) {
      cannotRun(`probe.${kind} for ${probe.file} is not a valid regular expression`, re.bad);
    }
    const hit = re.test(text);
    if (kind === 'absent' && hit) {
      return { ok: false, why: `REGRESSED — /${src}/ matches ${probe.file} again` };
    }
    if (kind === 'present' && !hit) {
      return { ok: false, why: `REGRESSED — /${src}/ no longer matches ${probe.file}` };
    }
  }
  return { ok: true };
}

function anchorState(f) {
  if (!f.anchorFile) return 'no-anchor';
  return existsSync(path.join(repoRoot, f.anchorFile)) ? 'live' : 'gone';
}

function runVerify({ silent = false } = {}) {
  const ledger = readLedger();
  const findings = ledger.findings ?? [];
  const tally = { live: 0, gone: 0, 'no-anchor': 0 };
  const gone = [];
  const probeFailures = [];

  for (const f of findings) {
    const st = anchorState(f);
    tally[st] += 1;
    if (st === 'gone' && f.state === 'open') gone.push(f);
    if (f.probe) {
      const r = runProbe(f.probe);
      if (!r.ok) probeFailures.push({ f, why: r.why });
    }
  }

  if (!silent) {
    console.log(
      `[findings] verification pass over the CURRENT tree: ${findings.length} findings; ` +
        `${tally.live} anchors still exist, ${tally.gone} do not, ${tally['no-anchor']} carry no file anchor.`,
    );
    console.log(
      `[findings] ${findings.filter((f) => f.probe).length} findings carry a regression probe; ` +
        `${probeFailures.length} fired.`,
    );
    if (gone.length) {
      console.log('');
      console.log(
        `[findings] ${gone.length} OPEN finding(s) whose anchor file is gone. These are NOT`,
      );
      console.log(
        '[findings] cleared — a deleted file and a repaired defect look identical from here,',
      );
      console.log('[findings] and only re-reading the successor can tell them apart:');
      for (const f of gone) {
        console.log(`[findings]   ${f.key}  ${f.context} #${f.ordinal}  ${f.anchorFile}`);
      }
    }
  }
  return { tally, gone, probeFailures, findings, ledger };
}

// ---------------------------------------------------------------------------
// Check (the CI gate)
// ---------------------------------------------------------------------------

function runCheck() {
  const ledger = readLedger();
  const problems = [];

  // (1) Derivation. The ledger is a view; if it disagrees with the reports it
  //     describes, the view is stale and everything downstream is guesswork.
  const derived = deriveFindings();
  const derivedKeys = new Set(derived.map((d) => d.key));
  const ledgerKeys = new Set((ledger.findings ?? []).map((f) => f.key));
  for (const k of derivedKeys) {
    if (!ledgerKeys.has(k)) {
      const d = derived.find((x) => x.key === k);
      problems.push(
        `report finding ${d.context} #${d.ordinal} (key ${k}) is not in the ledger. ` +
          `Run: node scripts/findings.mjs --ingest`,
      );
    }
  }
  for (const k of ledgerKeys) {
    if (!derivedKeys.has(k)) {
      const f = ledger.findings.find((x) => x.key === k);
      problems.push(
        `ledger finding ${f.context} #${f.ordinal} (key ${k}) no longer derives from any report. ` +
          `Either the report was edited or the ledger was hand-written.`,
      );
    }
  }

  // (2) The corpus assertion. INDEX.md claims 190 findings over 38 contexts and
  //     verifies it two ways. A parser that suddenly finds 40 is a broken
  //     parser, not a shrunken corpus.
  if (derived.length !== EXPECTED_FINDINGS) {
    cannotRun(
      `derived ${derived.length} findings, expected ${EXPECTED_FINDINGS}`,
      'The report format changed or the parser broke. Nothing below can be trusted until ' +
        'that is resolved.',
    );
  }
  const ctx = new Set(derived.map((d) => d.context));
  if (ctx.size !== EXPECTED_CONTEXTS) {
    cannotRun(`derived ${ctx.size} contexts, expected ${EXPECTED_CONTEXTS}`, 'Report set changed.');
  }

  // (3) Every finding leaves through a NAMED door, and the doors that exist to
  //     record a human judgment must actually carry one.
  for (const f of ledger.findings ?? []) {
    if (!STATES.has(f.state)) {
      problems.push(`${f.key} (${f.context} #${f.ordinal}) has state "${f.state}", not in the vocabulary.`);
    }
    if (STATES_REQUIRING_REASON.has(f.state) && !f.reason) {
      problems.push(
        `${f.key} (${f.context} #${f.ordinal}) is "${f.state}" with no reason. ` +
          `Suppression is a verdict with provenance; without one it is just deletion.`,
      );
    }
    if (f.state === 'fixed' && !f.fixedIn) {
      problems.push(
        `${f.key} (${f.context} #${f.ordinal}) is "fixed" with no fixedIn. ` +
          `Remediation does not close a finding; verification does, and verification needs to ` +
          `name what shipped.`,
      );
    }
  }

  // (4) Regression probes. The louder state.
  const { probeFailures } = runVerify({ silent: true });
  for (const { f, why } of probeFailures) {
    problems.push(`${f.key} (${f.context} #${f.ordinal}) [${f.state}]: ${why}`);
  }

  console.log(
    `[findings] check: ${derived.length} findings re-derived from ${ctx.size} context reports; ` +
      `${ledgerKeys.size} in the ledger; ` +
      `${(ledger.findings ?? []).filter((f) => f.probe).length} regression probes run.`,
  );

  if (problems.length) {
    console.error('');
    for (const p of problems) console.error(`[findings] ${p}`);
    console.error('');
    process.exit(EXIT_VERDICT);
  }
  console.log('[findings] ledger derives cleanly, every state is named, every probe held.');
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------
// Report — the questions a ledger can answer and a snapshot cannot
// ---------------------------------------------------------------------------

function runReport() {
  const { findings, tally, ledger } = runVerify({ silent: true });
  const by = (fn) => {
    const m = new Map();
    for (const f of findings) m.set(fn(f), (m.get(fn(f)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };

  console.log(`[findings] ${findings.length} findings, first seen ${ledger.scan.date}.`);
  console.log('');
  console.log('  by state:');
  for (const [k, v] of by((f) => f.state)) console.log(`    ${String(v).padStart(4)}  ${k}`);
  console.log('  by severity:');
  for (const [k, v] of by((f) => f.severity)) console.log(`    ${String(v).padStart(4)}  ${k}`);
  console.log('  by lens:');
  for (const [k, v] of by((f) => f.lens)) console.log(`    ${String(v).padStart(4)}  ${k}`);
  console.log('');
  console.log(
    `  anchors: ${tally.live} live, ${tally.gone} gone, ${tally['no-anchor']} unanchored.`,
  );
  console.log(
    `  closure references: ${ledger.closureRecords.references} seen, ` +
      `${ledger.closureRecords.resolved} resolvable, ${ledger.closureRecords.unresolvable} not.`,
  );
  console.log('');
  console.log('  oldest open findings by severity (impact-per-effort ordering needs an');
  console.log('  effort estimate this corpus does not carry, so severity is the proxy and');
  console.log('  this report says so rather than implying a ranking it cannot compute):');
  const openCrit = findings.filter((f) => f.state === 'open' && f.severity === 'critical');
  for (const f of openCrit.slice(0, 10)) {
    console.log(`    ${f.key}  ${f.context} #${f.ordinal}  ${f.title.slice(0, 70)}`);
  }
  if (openCrit.length > 10) {
    console.log(`    ... and ${openCrit.length - 10} more open criticals (truncation disclosed).`);
  }
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------

if (INGEST) runIngest();
else if (CHECK) runCheck();
else if (VERIFY) runVerify(), process.exit(EXIT_OK);
else if (REPORT) runReport();
else {
  console.error('Usage: node scripts/findings.mjs --ingest | --check | --verify | --report');
  process.exit(EXIT_CANNOT_RUN);
}
