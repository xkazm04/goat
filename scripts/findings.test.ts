import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * findings.mjs as a GATE, driven against a fixture root.
 *
 * The script resolves its repo root from its own location, so a copy of it
 * under `<tmp>/scripts/` treats `<tmp>` as the repository: the real report
 * corpus and ledger are copied in, and an empty stub is created for every
 * anchor path so the tree "has" each anchored file. A test then removes or
 * rewrites exactly one thing and asks whether the gate notices.
 *
 * Two invariants pinned here, both about the ledger's own vocabulary:
 *
 *  1. `open` + anchor file gone -> a verdict. The vocabulary has a state for
 *     this (`needs-reanchor`: "the anchor file no longer exists. NOT fixed")
 *     and `--verify` reported the population, but `--check` — the CI rung —
 *     let an open finding sit on a file that no longer exists. Sweeps delete
 *     files; an open finding on a deleted file is a claim nobody can act on.
 *  2. `--verify` exits 1 when a regression probe fires. The header lists
 *     "a regression probe fired" under exit code 1; `--verify` exited 0
 *     regardless, so its summary line was the only place the fire showed.
 *
 * Negative controls (recorded 2026-09-05, before the fix): case 1 exited 0
 * with the anchor gone; case 2 exited 0 with a probe that could not hold.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_REL = path.join('docs', 'harness', 'ui-bug-combined-2026-06-16');

interface Finding {
  key: string;
  state: string;
  anchorFile: string | null;
  probe?: { file: string; absent?: string; present?: string };
  fixedIn?: string;
}
interface Ledger {
  findings: Finding[];
}

let root: string;

function makeFixture(): { ledgerPath: string; ledger: Ledger } {
  root = mkdtempSync(path.join(tmpdir(), 'findings-gate-'));
  mkdirSync(path.join(root, 'scripts'));
  cpSync(path.join(repoRoot, 'scripts', 'findings.mjs'), path.join(root, 'scripts', 'findings.mjs'));
  cpSync(path.join(repoRoot, REPORT_REL), path.join(root, REPORT_REL), { recursive: true });
  mkdirSync(path.join(root, '.ai'));
  const ledgerPath = path.join(root, '.ai', 'findings.json');
  cpSync(path.join(repoRoot, '.ai', 'findings.json'), ledgerPath);
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as Ledger;
  // Every anchored file exists (empty) so the fixture tree matches the ledger.
  for (const f of ledger.findings) {
    for (const p of [f.anchorFile, f.probe?.file]) {
      if (!p) continue;
      mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
      writeFileSync(path.join(root, p), '');
    }
  }
  return { ledgerPath, ledger };
}

function run(...args: string[]): { status: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [path.join(root, 'scripts', 'findings.mjs'), ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('findings.mjs gate', () => {
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('is green on a fixture whose every anchor exists', () => {
    makeFixture();
    // Probes with `present` cannot hold against empty stubs; strip probes for
    // the baseline run so the only variable under test is the anchor set.
    const p = path.join(root, '.ai', 'findings.json');
    const ledger = JSON.parse(readFileSync(p, 'utf8')) as Ledger;
    for (const f of ledger.findings) delete f.probe;
    writeFileSync(p, JSON.stringify(ledger, null, 2));
    const r = run('--check');
    expect(r.out).toContain('ledger derives cleanly');
    expect(r.status).toBe(0);
  });

  it('refuses an OPEN finding whose anchor file is gone (needs-reanchor is the door)', () => {
    const { ledgerPath, ledger } = makeFixture();
    for (const f of ledger.findings) delete f.probe;
    const victim = ledger.findings.find((f) => f.state === 'open' && f.anchorFile);
    expect(victim).toBeDefined();
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    rmSync(path.join(root, victim!.anchorFile!));

    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.out).toContain(victim!.key);
    expect(r.out).toContain('needs-reanchor');

    // The same finding marked needs-reanchor is accepted: the state IS the exit.
    victim!.state = 'needs-reanchor';
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    expect(run('--check').status).toBe(0);
  });

  it('--verify exits 1 when a regression probe fires', () => {
    const { ledgerPath, ledger } = makeFixture();
    for (const f of ledger.findings) delete f.probe;
    const fixed = ledger.findings.find((f) => f.state === 'fixed' && f.anchorFile);
    expect(fixed).toBeDefined();
    fixed!.probe = { file: fixed!.anchorFile!, present: 'ZZZ_this_token_is_not_in_an_empty_stub' };
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

    const r = run('--verify');
    expect(r.out).toContain('1 fired');
    expect(r.status).toBe(1);
  });
});
