#!/usr/bin/env node
/**
 * Source -> doc coupling: the map's reader.
 *
 * Registry: docs-sync/source-doc-mapping, docs-sync/coupled-surface-inventory,
 * docs-sync/same-change-enforcement.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until 2026-08-24 this repo declared exactly ONE source->doc coupling
 * (src/stores/registry.ts -> docs/STORE_DEPENDENCY_GRAPH.md) and carried 69
 * markdown files nobody could attribute to any source. Nothing read a change
 * record, so nothing would have caught -- at the commit that caused it -- the
 * store graph naming four stores that never existed, a lazy-loading document
 * headed "Complete" for a system that was never wired, or a whole feature
 * document (PARTICLE_THEME_SYSTEM.md) whose every named file is absent.
 *
 * TWO CHECKS, DELIBERATELY SEPARATE
 * ---------------------------------
 *   --coverage  (default)  Is the MAP itself honest, and how much of the
 *                          coupling universe does it claim? Membership checks
 *                          (does every path the map names resolve?) are
 *                          structurally incapable of seeing what the map
 *                          OMITS, so this also enumerates the universe and
 *                          counts the residue.
 *   --changed              Did this CHANGE settle what it owes? Reads the
 *                          version-control diff -- the only honest record of
 *                          what changed, and the only one that knows renames
 *                          and deletions. Never a transcript, never a list of
 *                          editor destinations.
 *
 * SATISFACTION IS ON THE NAMED TARGET. An entry that names
 * docs/E2E_BROWSER_TESTING.md is satisfied by that file and by nothing else --
 * not by "some file under docs/". A prefix-shaped satisfaction converts a
 * specific, actionable obligation into one discharged by accident.
 *
 * DISMISSAL IS FIRST-CLASS AND RECORDED. An internal-only change owes no
 * document, and says so in a commit trailer:
 *
 *     Docs-dismissed: internal refactor, no behaviour change
 *
 * The trailer is the durable artifact. A dismissal that leaves no artifact
 * cannot be counted, improved, argued about, or even known.
 *
 * EXIT CODES (a could-not-run is spelled differently from a verdict):
 *   0  green
 *   1  a verdict about the tree or the change -- unmapped rise, stale entry,
 *      missing reference doc, or an unsettled obligation
 *   2  COULD NOT RUN -- the map will not parse, git is unavailable, the base
 *      ref does not resolve, or the walk saw an implausible population. This
 *      is NOT a pass and NOT a failure. Nothing was measured.
 *
 * USAGE
 *   node scripts/doc-coupling.mjs                       coverage
 *   node scripts/doc-coupling.mjs --json                coverage, machine-readable
 *   node scripts/doc-coupling.mjs --changed --base main same-change, vs a ref
 *   node scripts/doc-coupling.mjs --changed --staged    same-change, index
 *   node scripts/doc-coupling.mjs --changed --working   same-change, working tree
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = path.join(repoRoot, '.ai', 'doc-coupling.json');

const argv = process.argv.slice(2);
const MODE_CHANGED = argv.includes('--changed');
const JSON_OUT = argv.includes('--json');
const STAGED = argv.includes('--staged');
const WORKING = argv.includes('--working');
const baseIdx = argv.indexOf('--base');
const BASE = baseIdx >= 0 ? argv[baseIdx + 1] : null;

const EXIT_OK = 0;
const EXIT_VERDICT = 1;
const EXIT_CANNOT_RUN = 2;

function cannotRun(what, detail) {
  console.error(`\n[doc-coupling] COULD NOT RUN — ${what}`);
  if (detail) console.error(`[doc-coupling] ${detail}`);
  console.error('[doc-coupling] This is not a pass and not a failure. Nothing was measured.');
  process.exit(EXIT_CANNOT_RUN);
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

let map;
try {
  map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
} catch (err) {
  cannotRun(`could not read ${rel(MAP_PATH)}`, String(err.message));
}
if (!Array.isArray(map.entries)) {
  cannotRun('the map has no `entries` array', `${rel(MAP_PATH)} parsed, but the shape is wrong.`);
}

function rel(p) {
  return path.relative(repoRoot, p).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Glob matching. Small on purpose: no dependency, and the semantics are
// written down rather than inherited from whichever minimatch is hoisted.
//   *   any run of characters except '/'
//   **  any run of characters including '/'
//   ?   one character except '/'
// A trailing '/**' also matches the directory itself.
// ---------------------------------------------------------------------------

function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // '/**' at the end: the directory itself counts as matched.
        if (glob.slice(i + 2) === '' && out.endsWith('/')) {
          out = `${out.slice(0, -1)}(?:/.*)?`;
        } else {
          out += '.*';
        }
        i += 1;
        if (glob[i + 1] === '/') i += 1, (out += '');
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`${out}$`);
}

const globCache = new Map();
function matchesGlob(file, glob) {
  let re = globCache.get(glob);
  if (!re) {
    re = globToRegExp(glob);
    globCache.set(glob, re);
  }
  return re.test(file);
}

// ---------------------------------------------------------------------------
// The tracked file population. `git ls-files` rather than a directory walk:
// it is the same population the diff speaks about, and it never wanders into
// node_modules or .next.
// ---------------------------------------------------------------------------

function trackedFiles() {
  let raw;
  try {
    raw = execFileSync('git', ['ls-files', '-z'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    cannotRun('git ls-files failed', String(err.message).slice(0, 400));
  }
  return raw.split('\0').filter(Boolean);
}

const ALL_FILES = trackedFiles();
if (ALL_FILES.length < 100) {
  cannotRun(
    `git ls-files returned ${ALL_FILES.length} paths`,
    'That is not this repository. Refusing to report coverage over a population that cannot be right.',
  );
}

const SOURCE_EXT = new Set(map.derivation?.colocatedReadme?.extensions ?? ['.ts', '.tsx']);
const isSource = (f) => SOURCE_EXT.has(path.extname(f));

// ---------------------------------------------------------------------------
// Derived couplings: a colocated README.md owns its directory subtree, with
// the NEAREST README winning. Derived rather than declared because the
// convention IS the recomputation -- it self-repairs under rename, which is
// the way a declared map dies.
// ---------------------------------------------------------------------------

function derivedEntries() {
  const cfg = map.derivation?.colocatedReadme;
  if (!cfg?.enabled) return [];
  const roots = cfg.roots ?? ['src'];
  const readmeDirs = ALL_FILES.filter(
    (f) => path.basename(f) === 'README.md' && roots.some((r) => f.startsWith(`${r}/`)),
  ).map((f) => ({ doc: f, dir: path.posix.dirname(f) }));

  // Longest dir first, so the nearest README claims a file before an ancestor.
  readmeDirs.sort((a, b) => b.dir.length - a.dir.length);

  const claimed = new Map(); // file -> doc
  for (const { doc, dir } of readmeDirs) {
    for (const f of ALL_FILES) {
      if (!isSource(f)) continue;
      if (!f.startsWith(`${dir}/`)) continue;
      if (!claimed.has(f)) claimed.set(f, doc);
    }
  }

  const byDoc = new Map();
  for (const [file, doc] of claimed) {
    if (!byDoc.has(doc)) byDoc.set(doc, []);
    byDoc.get(doc).push(file);
  }
  return [...byDoc].map(([doc, files]) => ({
    id: `derived:${doc}`,
    derived: true,
    reference: doc,
    files: files.sort(),
    note:
      'Derived from the colocated-README convention (see .ai/doc-coupling.json ' +
      'derivation.colocatedReadme). Not hand-maintained; recomputed from the ' +
      'current layout on every run.',
  }));
}

/** Declared entries, resolved against the live tree. */
function declaredEntries() {
  return map.entries.map((e) => ({
    ...e,
    derived: false,
    // Deduped: two globs on one entry may legitimately overlap
    // (`src/stores/*.ts` and `src/stores/**/*.ts`), and a file counted twice
    // would make every population number this script prints wrong.
    files: [...new Set((e.source ?? []).flatMap((g) => ALL_FILES.filter((f) => matchesGlob(f, g))))],
  }));
}

const ENTRIES = [...declaredEntries(), ...derivedEntries()];

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

function enumerateAreas() {
  const areas = new Set();
  for (const rootGlob of map.coverage?.areaRoots ?? []) {
    if (rootGlob.endsWith('/*')) {
      const parent = rootGlob.slice(0, -2);
      const abs = path.join(repoRoot, parent);
      if (!existsSync(abs)) continue;
      for (const name of readdirSync(abs)) {
        const child = path.join(abs, name);
        if (statSync(child).isDirectory()) areas.add(`${parent}/${name}`);
      }
    } else if (existsSync(path.join(repoRoot, rootGlob))) {
      areas.add(rootGlob);
    }
  }
  return [...areas].sort();
}

function runCoverage() {
  const problems = [];

  // (1) Every DECLARED entry must match at least one live file -- a stale glob
  //     is a dead entry wearing a live one's clothes. An entry may say
  //     `sourceStatus: unimplemented` instead, which is a finding recorded
  //     rather than a glob that silently matches nothing.
  for (const e of ENTRIES) {
    if (e.derived) continue;
    if (e.sourceStatus === 'unimplemented') continue;
    if (e.files.length === 0) {
      problems.push(
        `entry "${e.id}" matches ZERO live files. Its source globs are stale: ` +
          `${JSON.stringify(e.source)}`,
      );
    }
  }

  // (2) Every reference doc must exist.
  for (const e of ENTRIES) {
    if (!e.reference) {
      problems.push(`entry "${e.id}" declares no reference document. Reference is required.`);
      continue;
    }
    if (!existsSync(path.join(repoRoot, e.reference))) {
      problems.push(`entry "${e.id}" names a reference that does not exist: ${e.reference}`);
    }
  }

  // (3) The walked population, asserted against a floor. A coverage checker
  //     that walks zero directories reports perfect coverage.
  const areas = enumerateAreas();
  const floor = map.coverage?.minAreasWalked ?? 1;
  if (areas.length < floor) {
    cannotRun(
      `enumerated ${areas.length} areas, below the declared floor of ${floor}`,
      'coverage.areaRoots has probably stopped matching. Fix the walk before trusting any number.',
    );
  }

  // (4) Coverage itself: which areas does the map claim?
  const allow = map.coverage?.unmappedAllowlist ?? {};
  const claimedFiles = new Set(ENTRIES.flatMap((e) => e.files));
  const mapped = [];
  const unmapped = [];
  const allowlisted = [];
  for (const area of areas) {
    if (Object.hasOwn(allow, area)) {
      allowlisted.push(area);
      continue;
    }
    const anyClaimed = [...claimedFiles].some((f) => f === area || f.startsWith(`${area}/`));
    (anyClaimed ? mapped : unmapped).push(area);
  }

  // (5) An allowlist entry naming an area that no longer exists is itself rot.
  for (const area of Object.keys(allow)) {
    if (!areas.includes(area)) {
      problems.push(
        `unmappedAllowlist names "${area}", which the area walk does not find. ` +
          `Delete the exemption or fix the path.`,
      );
    }
  }

  const result = {
    areasWalked: areas.length,
    mapped: mapped.length,
    allowlisted: allowlisted.length,
    unmappedAreas: unmapped.length,
    unmapped,
    entries: ENTRIES.length,
    declaredEntries: ENTRIES.filter((e) => !e.derived).length,
    derivedEntries: ENTRIES.filter((e) => e.derived).length,
    filesClaimed: claimedFiles.size,
    sourceFiles: ALL_FILES.filter(isSource).length,
    problems,
  };

  if (JSON_OUT) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(problems.length ? EXIT_VERDICT : EXIT_OK);
  }

  // Every number names what it counted.
  console.log(
    `[doc-coupling] ${result.entries} entries ` +
      `(${result.declaredEntries} declared, ${result.derivedEntries} derived from colocated READMEs); ` +
      `${result.filesClaimed} of ${result.sourceFiles} tracked source files claimed.`,
  );
  console.log(
    `[doc-coupling] coverage: ${result.mapped} of ${result.areasWalked} areas mapped, ` +
      `${result.allowlisted} allowlisted with a reason, ${result.unmappedAreas} unmapped.`,
  );
  if (unmapped.length) {
    console.log(
      `[doc-coupling] unmapped areas (held at ${result.unmappedAreas} by the ` +
        `docs:unmappedAreas ratchet bucket — the next one is refused):`,
    );
    for (const a of unmapped) console.log(`[doc-coupling]   ${a}`);
  }

  if (problems.length) {
    console.error('');
    for (const p of problems) console.error(`[doc-coupling] BROKEN ENTRY — ${p}`);
    console.error('');
    console.error('An entry that names nothing live, or a reference that is not on disk,');
    console.error('is a coupling nobody can settle. Fix the map or fix the tree.');
    process.exit(EXIT_VERDICT);
  }
  console.log('[doc-coupling] every entry resolves, and every reference document exists.');
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------
// Same-change enforcement
// ---------------------------------------------------------------------------

function git(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * The change record. `--name-status` with rename detection on, so a file that
 * LEFT a mapped area is seen as leaving it -- which a list of editor
 * destinations structurally cannot know.
 */
function changedFiles() {
  if (WORKING) return parseNameStatus(git(['diff', '--name-status', '-M', 'HEAD']));
  if (STAGED) return parseNameStatus(git(['diff', '--name-status', '-M', '--cached']));
  if (!BASE) {
    cannotRun(
      'no change record selected',
      'Pass --base <ref> (the usual CI shape), or --staged, or --working.',
    );
  }
  let base = BASE;
  try {
    base = git(['merge-base', BASE, 'HEAD']).trim() || BASE;
  } catch {
    // Shallow clone or an unrelated history: fall back to the raw ref, and let
    // the diff below be the thing that fails if the ref is genuinely bad.
  }
  try {
    return parseNameStatus(git(['diff', '--name-status', '-M', `${base}`, 'HEAD']));
  } catch (err) {
    cannotRun(
      `could not diff against "${BASE}"`,
      `${String(err.message).slice(0, 300)}\nOn CI this usually means fetch-depth: 0 is missing.`,
    );
  }
}

function parseNameStatus(raw) {
  const files = new Set();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0];
    if (status.startsWith('R') || status.startsWith('C')) {
      // Both sides count: the old path left its area, the new path entered one.
      if (parts[1]) files.add(parts[1]);
      if (parts[2]) files.add(parts[2]);
    } else {
      if (parts[1]) files.add(parts[1]);
    }
  }
  return [...files];
}

/** Dismissals live in commit trailers -- git history is the durable ledger. */
function dismissals() {
  let range;
  if (WORKING || STAGED) range = ['-1', 'HEAD'];
  else {
    let base = BASE;
    try {
      base = git(['merge-base', BASE, 'HEAD']).trim() || BASE;
    } catch {
      /* fall through with the raw ref */
    }
    range = [`${base}..HEAD`];
  }
  let raw = '';
  try {
    raw = git(['log', ...range, '--format=%B%n--%n']);
  } catch {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .filter((l) => /^Docs-dismissed:\s*\S/.test(l.trim()))
    .map((l) => l.trim().replace(/^Docs-dismissed:\s*/, ''));
}

function runChanged() {
  const changed = changedFiles();
  const changedSet = new Set(changed);
  const dismissed = dismissals();

  const obligations = [];
  for (const e of ENTRIES) {
    // A generated document is checked by recomputation, which is strictly
    // stronger than a nag. Declaring the generator here suppresses a duplicate.
    if (e.generatedBy) continue;
    const touched = e.files.filter((f) => changedSet.has(f));
    if (touched.length === 0) continue;
    if (changedSet.has(e.reference)) continue; // satisfied ON THE NAMED TARGET
    obligations.push({ id: e.id, reference: e.reference, touched, note: e.note });
  }

  console.log(
    `[doc-coupling] same-change: ${changed.length} changed paths read from the git diff ` +
      `(${WORKING ? 'working tree' : STAGED ? 'index' : `vs ${BASE}`}), ` +
      `${ENTRIES.length} entries evaluated.`,
  );

  if (obligations.length === 0) {
    console.log('[doc-coupling] verdict: SATISFIED — no coupled document is owed by this change.');
    process.exit(EXIT_OK);
  }

  for (const o of obligations) {
    console.error('');
    console.error(`[doc-coupling] OWED — ${o.reference}`);
    console.error(`[doc-coupling]   entry: ${o.id}`);
    console.error(
      `[doc-coupling]   changed: ${o.touched.slice(0, 8).join(', ')}` +
        (o.touched.length > 8 ? ` (+${o.touched.length - 8} more)` : ''),
    );
    if (o.note) console.error(`[doc-coupling]   when this surface is reached: ${o.note}`);
  }

  if (dismissed.length) {
    console.log('');
    console.log(
      `[doc-coupling] verdict: DISMISSED (${dismissed.length} recorded ` +
        `Docs-dismissed trailer${dismissed.length === 1 ? '' : 's'}):`,
    );
    for (const d of dismissed) console.log(`[doc-coupling]   "${d}"`);
    console.log('[doc-coupling] The trailer is the artifact. This dismissal is countable.');
    process.exit(EXIT_OK);
  }

  console.error('');
  console.error(
    `[doc-coupling] verdict: UNSETTLED — ${obligations.length} coupled document(s) owed and not updated.`,
  );
  console.error('Update the named document in this same change, or dismiss it on the record');
  console.error('with a commit trailer that says why:');
  console.error('');
  console.error('    Docs-dismissed: internal-only refactor, no behaviour change');
  console.error('');
  process.exit(EXIT_VERDICT);
}

MODE_CHANGED ? runChanged() : runCoverage();
