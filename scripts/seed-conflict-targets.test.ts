import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * A Supabase `upsert(rows, { onConflict })` only works when `onConflict` names
 * a column set that a UNIQUE or PRIMARY KEY constraint actually covers —
 * otherwise Postgres refuses every batch ("there is no unique or exclusion
 * constraint matching the ON CONFLICT specification") and the seeder writes
 * nothing. The schema files under db/ are the declared truth; this test is
 * parity-auditor's figure applied to seed code vs schema.
 *
 * Negative control (recorded 2026-09-05, before the fix): seed-categories.ts
 * upserted item_groups on `slug` — a column db/item_groups.sql does not have —
 * and items on `name,group_id`, which no constraint covers (items is unique on
 * name, category, subcategory). Both assertions were red; seed-e2e.ts (all on
 * `id`) was green throughout.
 */

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(scriptsDir, '..', 'db');

const SEEDERS = ['seed-categories.ts', 'seed-e2e.ts'];

/**
 * Strip JSDoc-style block comments (opened at line start) and full-line `//`
 * comments. Block comments are anchored to line start on purpose: seed-e2e.ts
 * contains the string literal '//***', whose `/*` an unanchored stripper took
 * as a comment opener and swallowed 4 KB of code — the detector then saw zero
 * upserts, which the "has upserts this test can see" assertion caught.
 */
function stripComments(source: string): string {
  return source.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/^\s*\/\/.*$/gm, '');
}

const normalize = (cols: string) =>
  cols
    .split(',')
    .map((c) => c.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .sort()
    .join(',');

/** Every column set a UNIQUE or PRIMARY KEY constraint covers in db/<table>.sql. */
function uniqueColumnSets(table: string): Set<string> | null {
  const file = path.join(dbDir, `${table}.sql`);
  if (!existsSync(file)) return null;
  const sql = readFileSync(file, 'utf8');
  const sets = new Set<string>();
  for (const m of sql.matchAll(/(?:primary\s+key|unique)\s*\(([^)]+)\)/gi)) sets.add(normalize(m[1]));
  return sets;
}

interface Upsert {
  table: string;
  onConflict: string;
  line: number;
}

/** Each `.from('<table>')…upsert(…{ onConflict: '<cols>' })` chain in a script. */
function upsertsIn(source: string): Upsert[] {
  const src = stripComments(source);
  const found: Upsert[] = [];
  for (const m of src.matchAll(/\.upsert\(/g)) {
    const before = src.slice(0, m.index);
    const from = [...before.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)].pop();
    const after = src.slice(m.index, m.index! + 600);
    const oc = after.match(/onConflict:\s*["']([^"']+)["']/);
    if (!from || !oc) continue;
    found.push({ table: from[1], onConflict: normalize(oc[1]), line: before.split('\n').length });
  }
  return found;
}

describe('seed scripts upsert on column sets the schema actually makes unique', () => {
  for (const script of SEEDERS) {
    const upserts = upsertsIn(readFileSync(path.join(scriptsDir, script), 'utf8'));

    it(`${script} has upserts this test can see`, () => {
      // A seeder with zero detectable upserts means the detector went blind, not
      // that the seeder is clean (registry: the-tree-is-not-the-population).
      expect(upserts.length).toBeGreaterThan(0);
    });

    for (const u of upserts) {
      it(`${script}:${u.line} upserts ${u.table} on (${u.onConflict}) — a declared unique set`, () => {
        const sets = uniqueColumnSets(u.table);
        if (sets === null) {
          // No db/<table>.sql: reported, not silently passed.
          console.warn(`[seed-conflict-targets] no db/${u.table}.sql — ${script}:${u.line} not checked`);
          return;
        }
        expect(Array.from(sets), `db/${u.table}.sql unique sets`).toContain(u.onConflict);
      });
    }
  }
});
