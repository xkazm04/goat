import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * doc-coupling's coverage population must be the TRACKED tree, not the disk.
 *
 * Every other number the script prints is derived from `git ls-files` — the
 * same population the change record speaks about, which never wanders into
 * node_modules or .next. `enumerateAreas()` alone walked the filesystem, so an
 * EMPTY directory — the thing git structurally cannot track — counted as an
 * unmapped area. Deleting the last file in a folder leaves exactly such a
 * directory behind on the machine that did the deleting, so a developer's
 * checkout and CI's fresh clone disagreed on the `docs:unmappedAreas` ratchet
 * bucket for the same commit.
 *
 * Negative control (recorded 2026-09-05, before the fix): with
 * `src/lib/__doc_coupling_probe_empty__/` created and left empty, `--json`
 * reported unmappedAreas one higher than without it — the first assertion
 * below was red. Measured in the wild the same day: the sweep coordinator's
 * checkout read 72 where a clean worktree of the same tree read 70, from two
 * such directories (src/lib/orchestration, src/lib/virtual).
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(repoRoot, 'scripts', 'doc-coupling.mjs');
const PROBE_DIR = path.join(repoRoot, 'src', 'lib', '__doc_coupling_probe_empty__');

interface Coverage {
  areasWalked: number;
  unmappedAreas: number;
  unmapped: string[];
}

function coverage(): Coverage {
  let raw: string;
  try {
    raw = execFileSync(process.execPath, [SCRIPT, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // exit 1 = a broken entry, still with JSON on stdout; the count is valid.
    const e = err as { stdout?: string; status?: number };
    if (!e.stdout) throw err;
    raw = e.stdout;
  }
  return JSON.parse(raw) as Coverage;
}

describe('doc-coupling coverage population', () => {
  afterEach(() => {
    if (existsSync(PROBE_DIR)) rmdirSync(PROBE_DIR);
  });

  it('does not count an empty on-disk directory as an unmapped area', () => {
    const before = coverage();
    expect(before.areasWalked).toBeGreaterThan(50);

    mkdirSync(PROBE_DIR);
    const withEmptyDir = coverage();

    expect(withEmptyDir.areasWalked).toBe(before.areasWalked);
    expect(withEmptyDir.unmappedAreas).toBe(before.unmappedAreas);
    expect(withEmptyDir.unmapped).not.toContain('src/lib/__doc_coupling_probe_empty__');
  });

  it('still enumerates the areas that hold tracked source', () => {
    const { unmapped, areasWalked } = coverage();
    // Two areas that exist as tracked files and are, today, unmapped.
    expect(unmapped).toContain('src/lib/api');
    expect(unmapped).toContain('src/providers');
    expect(areasWalked).toBeGreaterThanOrEqual(unmapped.length);
  });
});
