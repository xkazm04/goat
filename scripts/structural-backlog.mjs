#!/usr/bin/env node
/**
 * The structural improvement loop's reader.
 *
 * Registry: module-design/structural-improvement-loop, locality-and-leverage.
 *
 * WHY THIS EXISTS
 * ---------------
 * docs/STORE_DEPENDENCY_GRAPH.md used to carry a four-phase migration plan
 * whose "Success Criteria" checkboxes were ticked for work that had not landed
 * — `dragHandlers.ts` was listed as shipped and does not exist in this tree and
 * never has. A plan that marks itself complete is not a loop; it is a document
 * that has stopped being able to be wrong.
 *
 * `.ai/structural-backlog.json` replaces it with a loop that can be wrong, and
 * this script is what makes it so.
 *
 * WHAT IS CHECKED, AND WHY EACH IS INPUT-DETERMINISTIC
 * ----------------------------------------------------
 * 1. GROUNDING. Every spec names at least two concrete places and the relation
 *    between them, and this asserts those places still exist and still say what
 *    the spec says they say. This is the whole point: an ungrounded structural
 *    proposal is unfalsifiable, and a proposal argued from a stale map is the
 *    most persuasive kind of wrong, because the map was accurate once. A check
 *    run over a proxy passes exactly when the proxy has diverged.
 * 2. STOP CONDITIONS. A spec whose stop condition is MET but whose status is
 *    still `accepted` is a spec that was executed and never closed. That is a
 *    verdict about the file, derived from the tree.
 * 3. STATUS OBLIGATIONS. `accepted` needs a target, a named trade, an
 *    invariant, a stop condition and a review-by date. `declined` and `retired`
 *    need a reason — an undocumented decline is re-proposed every pass forever.
 * 4. THE INSTRUMENT. A pass that found nothing and a pass that could not read
 *    the tree must be spelled differently. This matters more here than almost
 *    anywhere, because "the structure is fine" is the output everyone wants and
 *    the output a broken pass produces.
 *
 * WHAT IS REPORTED, NOT GATED
 * ---------------------------
 * The review-by date. Whether a spec is overdue is a function of the CALENDAR,
 * not of the tree, so a blocking gate on it would wall an unrelated change for
 * something its author did not do and cannot fix — the same reason this repo
 * has no blocking supply-chain job. It prints loudly and exits 0.
 *
 * EXIT CODES
 *   0  every spec is grounded and every status carries its obligations
 *   1  a verdict — grounding broken, stop condition met but unclosed, or a
 *      status missing what that status requires
 *   2  COULD NOT RUN. Not a pass and not a failure.
 *
 * USAGE
 *   node scripts/structural-backlog.mjs            check
 *   node scripts/structural-backlog.mjs --report   the loop's memory, readable
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG_PATH = path.join(repoRoot, '.ai', 'structural-backlog.json');

const REPORT = process.argv.slice(2).includes('--report');

const EXIT_OK = 0;
const EXIT_VERDICT = 1;
const EXIT_CANNOT_RUN = 2;

function cannotRun(what, detail) {
  console.error(`\n[structure] COULD NOT RUN — ${what}`);
  if (detail) console.error(`[structure] ${detail}`);
  console.error('[structure] This is not a pass and not a failure. Nothing was measured.');
  process.exit(EXIT_CANNOT_RUN);
}

let backlog;
try {
  backlog = JSON.parse(readFileSync(BACKLOG_PATH, 'utf8'));
} catch (err) {
  cannotRun('could not read .ai/structural-backlog.json', String(err.message));
}

const specs = backlog.specs;
if (!Array.isArray(specs) || specs.length === 0) {
  // "The structure is fine" is what a broken pass says.
  cannotRun(
    'the backlog holds zero specs',
    'A loop with an empty backlog and a loop that failed to load one are different things. ' +
      'If the pass genuinely found nothing, record that as a dated note rather than an empty array.',
  );
}

const STATUSES = new Set(['accepted', 'executed', 'declined', 'retired']);
const read = (rel) => {
  const abs = path.join(repoRoot, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
};

const problems = [];
let groundingAssertions = 0;

for (const s of specs) {
  if (!STATUSES.has(s.status)) {
    problems.push(`${s.id}: status "${s.status}" is not one of ${[...STATUSES].join(', ')}.`);
    continue;
  }

  // --- grounding: both ends, quoted, still true -----------------------------
  const grounding = s.grounding ?? [];
  if (grounding.length < 2 && s.status !== 'executed') {
    problems.push(
      `${s.id}: grounded in ${grounding.length} place(s). A structural candidate names AT LEAST ` +
        `TWO concrete places and the relation between them — the relation IS the finding, and one ` +
        `location cannot hold it.`,
    );
  }
  for (const g of grounding) {
    const text = read(g.file);
    if (text === null) {
      if (g.absent === true) continue;
      problems.push(
        `${s.id}: grounding file does not exist — ${g.file}. The spec is argued from a tree that ` +
          `has moved. Re-ground it or retire it; do not discuss it as written.`,
      );
      continue;
    }
    groundingAssertions += 1;
    if (g.mustContain && !text.includes(g.mustContain)) {
      problems.push(
        `${s.id}: ${g.file} no longer contains "${g.mustContain}". The quoted relation has ` +
          `changed under the spec.`,
      );
    }
    if (g.mustNotContain && text.includes(g.mustNotContain)) {
      problems.push(
        `${s.id}: ${g.file} now contains "${g.mustNotContain}", which the spec asserts it does ` +
          `not. Either the spec was executed and is unclosed, or its premise is gone.`,
      );
    }
    // Regex forms, for the case a substring is too blunt. Measured need: the
    // first version of this check used mustNotContain "useMagneticSnap" on a
    // barrel, and fired on the AUTOPSY COMMENT left at the deletion site — the
    // symbol was named there precisely so the next reader would know why it was
    // gone. A predicate that cannot tell an export from a comment about an
    // export is not measuring what it claims to.
    for (const [kind, src] of [
      ['mustMatch', g.mustMatch],
      ['mustNotMatch', g.mustNotMatch],
    ]) {
      if (!src) continue;
      let re;
      try {
        re = new RegExp(src, 'm');
      } catch (err) {
        cannotRun(`${s.id}: grounding.${kind} for ${g.file} is not a valid regex`, String(err.message));
      }
      const hit = re.test(text);
      if (kind === 'mustMatch' && !hit) {
        problems.push(`${s.id}: ${g.file} no longer matches /${src}/. The quoted relation has changed.`);
      }
      if (kind === 'mustNotMatch' && hit) {
        problems.push(
          `${s.id}: ${g.file} matches /${src}/, which the spec asserts it does not. Either the ` +
            `spec was executed and is unclosed, or its premise is gone.`,
        );
      }
    }
  }

  // --- status obligations ---------------------------------------------------
  if (s.status === 'accepted') {
    for (const field of ['target', 'trade', 'invariant', 'stopCondition', 'reviewBy']) {
      if (!s[field]) {
        problems.push(
          `${s.id}: accepted with no ${field}. ` +
            (field === 'trade'
              ? 'A target with no stated cost has not been thought through; it will acquire its cost later, in front of an audience.'
              : field === 'stopCondition'
                ? 'Without a stop condition a partial migration is neither finished nor recorded as a state the codebase is in.'
                : field === 'reviewBy'
                  ? 'An accepted-but-unscheduled spec decays silently — the code moves underneath it and it becomes wrong without ever being rejected.'
                  : 'Required for an accepted spec.'),
        );
      }
    }
    if (s.trade && !(s.trade.buys && s.trade.spends && s.trade.whoCollects)) {
      problems.push(
        `${s.id}: the trade must say what it BUYS, what it SPENDS and WHO COLLECTS each. A ` +
          `proposal that claims to improve both locality and leverage with no cost is usually an ` +
          `argument that has not yet found its cost.`,
      );
    }
  }
  if ((s.status === 'declined' || s.status === 'retired') && !s.reason) {
    problems.push(
      `${s.id}: ${s.status} with no reason. An undocumented decline is re-proposed every pass ` +
        `forever, and the loop's credibility is spent re-explaining the same no.`,
    );
  }
  if (s.status === 'executed' && !s.executedIn) {
    problems.push(`${s.id}: executed with no executedIn naming what met the stop condition.`);
  }
}

// --- stop conditions, evaluated against the tree ----------------------------

function clauseHolds(c) {
  const text = read(c.file);
  if (c.absent === true) return text === null;
  if (text === null) return false;
  if (c.contains) return text.includes(c.contains);
  return true;
}

const stopStates = [];
for (const s of specs) {
  const sc = s.stopCondition;
  if (!sc || sc.manual) {
    stopStates.push({ id: s.id, status: s.status, met: null });
    continue;
  }
  let met = null;
  if (Array.isArray(sc.anyOf)) met = sc.anyOf.some(clauseHolds);
  else if (Array.isArray(sc.allOf)) met = sc.allOf.every(clauseHolds);
  stopStates.push({ id: s.id, status: s.status, met });

  if (met === true && s.status === 'accepted') {
    problems.push(
      `${s.id}: the stop condition is MET but the spec is still "accepted". It was executed and ` +
        `never closed — mark it executed and name what did it, so the next pass does not ` +
        `re-propose finished work.`,
    );
  }
  if (met === false && s.status === 'executed') {
    problems.push(
      `${s.id}: marked "executed" but the stop condition does NOT hold. Either the work was ` +
        `reverted or the spec never met its own bar. This is the self-ticking checkbox the whole ` +
        `file exists to prevent.`,
    );
  }
}

// --- report -----------------------------------------------------------------

const byStatus = {};
for (const s of specs) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

console.log(
  `[structure] ${specs.length} specs (` +
    Object.entries(byStatus)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ') +
    `); ${groundingAssertions} grounding assertions evaluated against the current tree.`,
);

// Overdue: reported, never gated. Its input is the calendar, not the tree.
const today = new Date().toISOString().slice(0, 10);
const overdue = specs.filter((s) => s.status === 'accepted' && s.reviewBy && s.reviewBy < today);
if (overdue.length) {
  console.log('');
  console.log(
    `[structure] ${overdue.length} accepted spec(s) are past their review-by date. This is a ` +
      `REPORT, not a failure:`,
  );
  console.log(
    `[structure] the input is the calendar, not the tree, so blocking on it would wall an ` +
      `unrelated change for something its author did not do.`,
  );
  for (const s of overdue) {
    console.log(`[structure]   ${s.id} — review-by ${s.reviewBy}. Re-ground it, or retire it with a reason.`);
  }
}

if (REPORT) {
  console.log('');
  console.log(`  cadence: ${backlog.cadence?.interval ?? 'unstated'} (last pass ${backlog.cadence?.lastPass ?? '?'})`);
  for (const s of specs) {
    const st = stopStates.find((x) => x.id === s.id);
    const stop = st?.met === null ? 'manual judgment' : st?.met ? 'MET' : 'not met';
    console.log('');
    console.log(`  [${s.status}] ${s.id}   stop condition: ${stop}`);
    if (s.candidateShape) console.log(`      shape:  ${s.candidateShape}`);
    if (s.target) console.log(`      target: ${s.target}`);
    if (s.trade) console.log(`      trade:  buys ${s.trade.buys}`);
    if (s.reason) console.log(`      reason: ${s.reason.slice(0, 200)}${s.reason.length > 200 ? '…' : ''}`);
  }
}

if (problems.length) {
  console.error('');
  for (const p of problems) console.error(`[structure] ${p}`);
  console.error('');
  process.exit(EXIT_VERDICT);
}
console.log('[structure] every spec is still grounded, and every status carries its obligations.');
process.exit(EXIT_OK);
