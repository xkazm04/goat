import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * database.ts claims to mirror the Supabase schema. Nothing checked that claim
 * until 2026-09-05, when the measurement was: 19 tables created by in-tree SQL,
 * 11 of them typed; 5 typed tables with no in-tree DDL at all. This test pins
 * BOTH denominators (docs-sync / checked-vs-skipped-denominators), the way the
 * lint ratchet pins its buckets: a table that gains DDL without a type reddens
 * `KNOWN_UNTYPED`, a table that gains a type reddens it the other way, and a
 * typed table that loses its DDL reddens `TYPED_WITHOUT_DDL`. Shrinking either
 * list is the intended way to make it go green again.
 *
 * Ground truth is the SQL, read from disk — not a list this file maintains of
 * what the SQL says. The only hand-maintained lists are the two exceptions,
 * and each is checked in both directions so it cannot rot silently.
 *
 * Negative control (recorded 2026-09-05): a seeded
 * `supabase/migrations/99999999999999_seed.sql` with `CREATE TABLE phantom_seed`
 * turned the KNOWN_UNTYPED assertion red (expected set +1); deleting the seed
 * turned it green again.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

/** Typed tables no in-tree SQL creates. Each carries the reason it is allowed. */
const TYPED_WITHOUT_DDL: Record<string, string> = {
  users: 'created outside the migrations lane (referenced by lists_user_id_fkey and later migrations)',
  user_profiles: 'legacy Clerk-era profile table; header marks it as retained for migration',
  top_items: 'legacy table the header itself calls "possibly a view or duplicate"',
  top_groups: 'legacy table the header itself calls "possibly a view or duplicate"',
  user_id_mapping: 'Clerk-to-Supabase migration table with no in-tree DDL',
};

/** Tables in-tree SQL creates that database.ts does not type yet. */
const KNOWN_UNTYPED = [
  'ai_generated_images',
  'blueprint_ratings',
  'challenge_entries',
  'challenges',
  'item_consensus_cache',
  'ranking_aggregates',
  'ranking_submissions',
  'user_preferences',
  'user_stats',
].sort();

function typedTables(): string[] {
  const src = readFileSync(path.join(here, 'database.ts'), 'utf8');
  const start = src.indexOf('    Tables: {');
  const end = src.indexOf('    Views: {', start);
  if (start < 0 || end < 0) throw new Error('database.ts: Tables/Views block not found');
  const block = src.slice(start, end);
  return Array.from(block.matchAll(/^ {6}([a-z_]+): \{$/gm), (m) => m[1]).sort();
}

function sqlFiles(): string[] {
  const dirs = ['supabase/migrations', 'db/migrations', 'db'];
  const out: string[] = [];
  for (const d of dirs) {
    const abs = path.join(repoRoot, d);
    let names: string[] = [];
    try { names = readdirSync(abs); } catch { continue; }
    for (const n of names) if (n.endsWith('.sql')) out.push(path.join(abs, n));
  }
  return out.sort();
}

function createdTables(): string[] {
  const created = new Set<string>();
  // database.ts mirrors the public schema only. A name qualified with another
  // schema (goat_v2.lists, typed under src/v2) is not its population, so the
  // trailing lookahead refuses a partial match such as `goat_v` out of
  // `goat_v2.profiles` (negative control 2026-10-09: without it the run
  // reported a phantom untyped table "goat_v").
  const re = /\b(create|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:public\.)?"?([a-z_]+)"?(?![\w.])/gi;
  for (const f of sqlFiles()) {
    const sql = readFileSync(f, 'utf8').replace(/--[^\n]*/g, '');
    for (const m of sql.matchAll(re)) {
      if (m[1].toLowerCase() === 'create') created.add(m[2].toLowerCase());
      else created.delete(m[2].toLowerCase());
    }
  }
  return Array.from(created).sort();
}

describe('database.ts vs the SQL that creates the tables', () => {
  const typed = typedTables();
  const created = createdTables();

  it('reads a plausible population from both sides', () => {
    expect(typed.length).toBeGreaterThan(5);
    expect(created.length).toBeGreaterThan(5);
  });

  it('every typed table is created in-tree, or is on the allowlist with a reason', () => {
    const missing = typed.filter((t) => !created.includes(t));
    expect(missing.sort()).toEqual(Object.keys(TYPED_WITHOUT_DDL).sort());
    for (const [t, why] of Object.entries(TYPED_WITHOUT_DDL)) expect(why.length, t).toBeGreaterThan(10);
  });

  it('the allowlist names no table that in-tree SQL does create', () => {
    expect(Object.keys(TYPED_WITHOUT_DDL).filter((t) => created.includes(t))).toEqual([]);
  });

  it('the set of created-but-untyped tables is exactly KNOWN_UNTYPED', () => {
    const untyped = created.filter((t) => !typed.includes(t)).sort();
    expect(untyped).toEqual(KNOWN_UNTYPED);
  });
});
